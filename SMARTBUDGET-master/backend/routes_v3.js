import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, Transaction, Settings, Budget } from './models.js';
import multer from 'multer';
import { parse as csvParse } from 'csv-parse/sync';
import xlsx from 'xlsx';
import { authenticateToken } from './middleware.js';

const router = express.Router();

// ========== AUTH ==========
router.post('/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });

// ========== BULK & UPLOAD ==========
function normalizeRow(raw) {
  const out = {
    date: raw.date ?? raw.Date ?? raw.DATE ?? raw["Transaction Date"],
    description: raw.description ?? raw.Description ?? raw.Merchant ?? raw.MERCHANT,
    category: raw.category ?? raw.Category ?? raw.CATEGORY,
    type: (raw.type ?? raw.Type ?? raw.TYPE ?? '').toString().toLowerCase(),
    amount: raw.amount ?? raw.Amount ?? raw.AMOUNT,
  };
  return out;
}

function validateRow(row, categoriesEnum) {
  const errors = [];
  const dateObj = new Date(row.date);
  if (!row.date || isNaN(dateObj.getTime())) errors.push('Invalid date');
  if (!row.description || String(row.description).trim().length === 0) errors.push('Missing description');
  const cat = String(row.category || '').trim();
  if (!cat || !categoriesEnum.includes(cat)) errors.push('Invalid category');
  const type = String(row.type || '').toLowerCase();
  if (!['income','expense'].includes(type)) errors.push('Invalid type');
  const amt = Number(row.amount);
  if (!(amt > 0)) errors.push('Amount must be positive');
  return { ok: errors.length === 0, errors, parsed: { date: dateObj, description: String(row.description).trim(), category: cat, type, amount: amt } };
}

router.post('/transactions/bulk', authenticateToken, async (req, res) => {
  try {
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
    if (!rows.length) return res.status(400).json({ message: 'rows array is required' });
    const categoriesEnum = (Transaction.schema.path('category').enumValues) || [];
    const results = [];
    const docs = [];
    for (let i = 0; i < rows.length; i++) {
      const norm = normalizeRow(rows[i]);
      const { ok, errors, parsed } = validateRow(norm, categoriesEnum);
      if (!ok) {
        results.push({ index: i, status: 'error', errors });
        continue;
      }
      docs.push({ userId: req.user._id, ...parsed });
      results.push({ index: i, status: 'ok' });
    }
    if (docs.length) await Transaction.insertMany(docs);
    res.json({ message: 'Processed bulk rows', inserted: docs.length, results });
  } catch (error) {
    console.error('Bulk insert error:', error);
    res.status(500).json({ message: 'Error processing bulk transactions' });
  }
});

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
router.post('/transactions/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'file is required' });
    const buf = req.file.buffer;
    const name = (req.file.originalname || '').toLowerCase();
    let rows = [];
    if (name.endsWith('.csv')) {
      const text = buf.toString('utf8');
      const parsed = csvParse(text, { columns: true, skip_empty_lines: true, trim: true });
      rows = parsed.map(normalizeRow);
    } else if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      const wb = xlsx.read(buf, { type: 'buffer' });
      const wsName = wb.SheetNames[0];
      const ws = wb.Sheets[wsName];
      const parsed = xlsx.utils.sheet_to_json(ws, { defval: '' });
      rows = parsed.map(normalizeRow);
    } else {
      return res.status(400).json({ message: 'Unsupported file type. Use CSV or Excel.' });
    }
    const categoriesEnum = (Transaction.schema.path('category').enumValues) || [];
    const results = [];
    const docs = [];
    rows.forEach((r, i) => {
      const { ok, errors, parsed } = validateRow(r, categoriesEnum);
      if (!ok) results.push({ index: i, status: 'error', errors });
      else { docs.push({ userId: req.user._id, ...parsed }); results.push({ index: i, status: 'ok' }); }
    });
    if (docs.length) await Transaction.insertMany(docs);
    res.json({ message: 'Processed upload', inserted: docs.length, total: rows.length, results });
  } catch (error) {
    console.error('Upload parse error:', error);
    res.status(500).json({ message: 'Error parsing uploaded file' });
  }
});

// Suggestions endpoint
router.get('/transactions/suggestions', authenticateToken, async (req, res) => {
  try {
    const { field = 'description', q = '' } = req.query;
    const queryText = String(q).toLowerCase();
    const categoriesEnum = (Transaction.schema.path('category').enumValues) || [];
    if (field === 'category') {
      const list = categoriesEnum.filter(c => !queryText || c.toLowerCase().startsWith(queryText)).slice(0, 10);
      return res.json({ field, suggestions: list });
    }
    if (field === 'description') {
      const docs = await Transaction.aggregate([
        { $match: { userId: req.user._id } },
        { $group: { _id: '$description', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 50 }
      ]);
      const list = docs.map(d => d._id).filter(v => v && (!queryText || v.toLowerCase().includes(queryText))).slice(0, 10);
      return res.json({ field, suggestions: list });
    }
    if (field === 'amount') {
      // optional: suggest amounts seen with similar descriptions
      const desc = String(req.query.description || '').trim();
      const pipeline = [ { $match: { userId: req.user._id } } ];
      if (desc) pipeline.push({ $match: { description: desc } });
      pipeline.push({ $group: { _id: '$amount', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 10 });
      const docs = await Transaction.aggregate(pipeline);
      const list = docs.map(d => d._id);
      return res.json({ field, suggestions: list });
    }
    res.json({ field, suggestions: [] });
  } catch (error) {
    console.error('Suggestions error:', error);
    res.status(500).json({ message: 'Error fetching suggestions' });
  }
});
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ message: existingUser.email === email ? 'Email already exists' : 'Username already exists' });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const user = new User({ username, email, passwordHash });
    await user.save();
    const settings = new Settings({ userId: user._id });
    await settings.save();
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ message: 'User created successfully', user: { id: user._id, username: user.username, email: user.email }, token });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Error creating user' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid email or password' });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: 'Invalid email or password' });
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ message: 'Login successful', user: { id: user._id, username: user.username, email: user.email }, token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Error logging in' });
  }
});

router.post('/profile', authenticateToken, async (req, res) => {
  try {
    const { username, email } = req.body;
    if (!username && !email) return res.status(400).json({ message: 'Nothing to update' });
    if (email) {
      const emailExists = await User.findOne({ email, _id: { $ne: req.user._id } });
      if (emailExists) return res.status(400).json({ message: 'Email already exists' });
    }
    if (username) {
      const usernameExists = await User.findOne({ username, _id: { $ne: req.user._id } });
      if (usernameExists) return res.status(400).json({ message: 'Username already exists' });
    }
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (username) user.username = username;
    if (email) user.email = email.toLowerCase();
    await user.save();
    res.json({ message: 'Profile updated successfully', user: { id: user._id, username: user.username, email: user.email } });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Error updating profile' });
  }
});

router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) return res.status(400).json({ message: 'Old and new password are required' });
    if (newPassword.length < 6) return res.status(400).json({ message: 'New password must be at least 6 characters' });
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const ok = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!ok) return res.status(401).json({ message: 'Old password is incorrect' });
    user.passwordHash = await bcrypt.hash(newPassword, 12);
    await user.save();
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Error changing password' });
  }
});

// ========== TRANSACTIONS ==========
router.get('/transactions', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 50, category, type, startDate, endDate, sort = '-date' } = req.query;
    const filter = { userId: req.user._id };
    if (category) filter.category = category;
    if (type) filter.type = type;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }
    const query = Transaction.find(filter).sort(sort.replace(',', ' '));
    const transactions = await query.limit(limit * 1).skip((page - 1) * limit);
    const total = await Transaction.countDocuments(filter);
    res.json({ transactions, totalPages: Math.ceil(total / limit), currentPage: Number(page), total });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ message: 'Error fetching transactions' });
  }
});

router.post('/transactions', authenticateToken, async (req, res) => {
  try {
    const { description, category, type, amount, date } = req.body;
    if (!description || !category || !type || !amount) return res.status(400).json({ message: 'All fields are required' });
    if (amount <= 0) return res.status(400).json({ message: 'Amount must be greater than 0' });
    const transaction = new Transaction({ userId: req.user._id, description, category, type, amount: parseFloat(amount), date: date ? new Date(date) : new Date() });
    await transaction.save();
    res.status(201).json({ message: 'Transaction added successfully', transaction });
  } catch (error) {
    console.error('Add transaction error:', error);
    res.status(500).json({ message: 'Error adding transaction' });
  }
});

router.delete('/transactions/:id', authenticateToken, async (req, res) => {
  try {
    const transaction = await Transaction.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!transaction) return res.status(404).json({ message: 'Transaction not found' });
    res.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    console.error('Delete transaction error:', error);
    res.status(500).json({ message: 'Error deleting transaction' });
  }
});

router.delete('/transactions', authenticateToken, async (req, res) => {
  try {
    const result = await Transaction.deleteMany({ userId: req.user._id });
    res.json({ message: `${result.deletedCount} transactions deleted successfully`, deletedCount: result.deletedCount });
  } catch (error) {
    console.error('Clear transactions error:', error);
    res.status(500).json({ message: 'Error clearing transactions' });
  }
});

// ========== SETTINGS ==========
router.get('/settings', authenticateToken, async (req, res) => {
  try {
    let settings = await Settings.findOne({ userId: req.user._id });
    if (!settings) {
      settings = new Settings({ userId: req.user._id });
      await settings.save();
    }
    res.json({ settings });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ message: 'Error fetching settings' });
  }
});

router.post('/settings', authenticateToken, async (req, res) => {
  try {
    const { monthlyBudget, notifications } = req.body;
    let settings = await Settings.findOne({ userId: req.user._id });
    if (!settings) settings = new Settings({ userId: req.user._id });
    if (monthlyBudget !== undefined) settings.monthlyBudget = monthlyBudget;
    if (notifications !== undefined) settings.notifications = notifications;
    await settings.save();
    res.json({ message: 'Settings updated successfully', settings });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ message: 'Error updating settings' });
  }
});

// ========== ANALYTICS ==========
router.get('/analytics/summary', authenticateToken, async (req, res) => {
  try {
    const { month, year } = req.query;
    const currentDate = new Date();
    const targetMonth = month ? parseInt(month) - 1 : currentDate.getMonth();
    const targetYear = year ? parseInt(year) : currentDate.getFullYear();
    const startDate = new Date(targetYear, targetMonth, 1);
    const endDate = new Date(targetYear, targetMonth + 1, 0);
    const transactions = await Transaction.find({ userId: req.user._id, date: { $gte: startDate, $lte: endDate } });
    const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const balance = income - expenses;
    const categoryBreakdown = {};
    transactions.filter(t => t.type === 'expense').forEach(t => { categoryBreakdown[t.category] = (categoryBreakdown[t.category] || 0) + t.amount; });
    const settings = await Settings.findOne({ userId: req.user._id });
    const monthlyBudget = settings?.monthlyBudget || 50000;
    res.json({ income, expenses, balance, monthlyBudget, categoryBreakdown, savingsRate: income > 0 ? ((balance / income) * 100).toFixed(1) : 0, budgetUsed: monthlyBudget > 0 ? ((expenses / monthlyBudget) * 100).toFixed(1) : 0 });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ message: 'Error fetching analytics' });
  }
});

// ========== EXPORT ==========
router.get('/export/csv', authenticateToken, async (req, res) => {
  try {
    const { category, type, startDate, endDate, sort = '-date' } = req.query;
    const filter = { userId: req.user._id };
    if (category) filter.category = category;
    if (type) filter.type = type;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }
    const transactions = await Transaction.find(filter).sort(sort.replace(',', ' '));
    const header = ['Date','Description','Category','Type','Amount'];
    const rows = transactions.map(t => [ new Date(t.date).toISOString(), (t.description||'').replace(/"/g,'""'), t.category, t.type, t.amount.toFixed(2) ]);
    const csvLines = [header.join(','), ...rows.map(r => r.map(v => /[,"]/.test(String(v)) ? `"${v}"` : v).join(','))];
    const csv = csvLines.join('\n');
    const filename = `transactions_${new Date().toISOString().slice(0,10)}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csv);
  } catch (error) {
    console.error('Export CSV error:', error);
    res.status(500).json({ message: 'Error exporting CSV' });
  }
});

router.get('/export/xml', authenticateToken, async (req, res) => {
  try {
    const { category, type, startDate, endDate, sort = '-date' } = req.query;
    const filter = { userId: req.user._id };
    if (category) filter.category = category;
    if (type) filter.type = type;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }
    const transactions = await Transaction.find(filter).sort(sort.replace(',', ' '));
    const escapeXml = (unsafe='') => String(unsafe)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\"/g, '&quot;')
      .replace(/'/g, '&apos;');
    const items = transactions.map(t => `  <transaction id="${t._id}">\n    <date>${escapeXml(new Date(t.date).toISOString())}</date>\n    <description>${escapeXml(t.description)}</description>\n    <category>${escapeXml(t.category)}</category>\n    <type>${escapeXml(t.type)}</type>\n    <amount>${t.amount.toFixed(2)}</amount>\n  </transaction>`).join('\n');
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<transactions user="${req.user._id}">\n${items}\n</transactions>`;
    const filename = `transactions_${new Date().toISOString().slice(0,10)}.xml`;
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(xml);
  } catch (error) {
    console.error('Export XML error:', error);
    res.status(500).json({ message: 'Error exporting XML' });
  }
});

export default router;
// ========== BUDGET ==========
router.get('/budget', authenticateToken, async (req, res) => {
  try {
    let budget = await Budget.findOne({ userId: req.user._id });
    if (!budget) {
      budget = new Budget({ userId: req.user._id, categories: [] });
      await budget.save();
    }
    res.json({ budget });
  } catch (error) {
    console.error('Get budget error:', error);
    res.status(500).json({ message: 'Error fetching budget' });
  }
});

router.post('/budget', authenticateToken, async (req, res) => {
  try {
    const { categories } = req.body;
    if (!Array.isArray(categories)) {
      return res.status(400).json({ message: 'Categories array is required' });
    }
    // basic validation
    for (const c of categories) {
      if (!c || !c.name || !c.type || typeof c.limit !== 'number') {
        return res.status(400).json({ message: 'Invalid category item' });
      }
      if (!['income','expense'].includes(c.type)) {
        return res.status(400).json({ message: 'Invalid category type' });
      }
      if (c.limit < 0) {
        return res.status(400).json({ message: 'Limit must be >= 0' });
      }
    }
    const updated = await Budget.findOneAndUpdate(
      { userId: req.user._id },
      { $set: { categories } },
      { upsert: true, new: true }
    );
    res.json({ message: 'Budget saved', budget: updated });
  } catch (error) {
    console.error('Save budget error:', error);
    res.status(500).json({ message: 'Error saving budget' });
  }
});

router.get('/budget/summary', authenticateToken, async (req, res) => {
  try {
    const { month, year } = req.query;
    const now = new Date();
    const m = month ? parseInt(month) - 1 : now.getMonth();
    const y = year ? parseInt(year) : now.getFullYear();
    const startDate = new Date(y, m, 1);
    const endDate = new Date(y, m + 1, 0);

    const budget = await Budget.findOne({ userId: req.user._id });
    const categories = budget?.categories || [];

    // Aggregate transactions of the month
    const tx = await Transaction.find({
      userId: req.user._id,
      date: { $gte: startDate, $lte: endDate }
    });

    const actualByCat = {};
    for (const t of tx) {
      const key = `${t.type}:${t.category}`;
      actualByCat[key] = (actualByCat[key] || 0) + t.amount;
    }

    // Build response
    const items = categories.map(c => {
      const key = `${c.type}:${c.name}`;
      const actual = actualByCat[key] || 0;
      const usedPct = c.limit > 0 ? Math.min(100, (actual / c.limit) * 100) : 0;
      return { name: c.name, type: c.type, limit: c.limit, actual, usedPct: Number(usedPct.toFixed(1)) };
    });

    const totalIncomeLimit = items.filter(i=>i.type==='income').reduce((s,i)=>s+i.limit,0);
    const totalExpenseLimit = items.filter(i=>i.type==='expense').reduce((s,i)=>s+i.limit,0);
    const totalIncomeActual = tx.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
    const totalExpenseActual = tx.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
    const remainingBudget = totalIncomeActual - totalExpenseActual;
    const percentUsed = totalIncomeActual>0 ? ((totalExpenseActual/totalIncomeActual)*100).toFixed(1) : 0;

    res.json({ items, totals: {
      totalIncomeLimit, totalExpenseLimit, totalIncomeActual, totalExpenseActual, remainingBudget, percentUsed
    }});
  } catch (error) {
    console.error('Budget summary error:', error);
    res.status(500).json({ message: 'Error computing budget summary' });
  }
});

 
