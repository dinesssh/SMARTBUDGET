import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, Transaction, Settings } from './models.js';
import { authenticateToken } from './middleware.js';

const router = express.Router();

// Auth Routes
router.post('/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (username) user.username = username;
    if (email) user.email = email.toLowerCase();
    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: { id: user._id, username: user.username, email: user.email },
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Error updating profile' });
  }
});
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });

    if (existingUser) {
      return res.status(400).json({ 
        message: existingUser.email === email ? 'Email already exists' : 'Username already exists' 
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = new User({ username, email, passwordHash });
    await user.save();

    // Create default settings for new user
    const settings = new Settings({ userId: user._id });
    await settings.save();

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'User created successfully',
      user: { id: user._id, username: user.username, email: user.email },
      token
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Error creating user' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Login successful',
      user: { id: user._id, username: user.username, email: user.email },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Error logging in' });
  }
});

// Transaction Routes
router.get('/transactions', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 50, category, type, startDate, endDate } = req.query;
    
    const filter = { userId: req.user._id };
    
    if (category) filter.category = category;
    if (type) filter.type = type;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const transactions = await Transaction.find(filter)
      .sort({ date: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Transaction.countDocuments(filter);

    res.json({
      transactions,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ message: 'Error fetching transactions' });
  }
});

router.post('/transactions', authenticateToken, async (req, res) => {
  try {
    const { description, category, type, amount, date } = req.body;

    if (!description || !category || !type || !amount) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (amount <= 0) {
      return res.status(400).json({ message: 'Amount must be greater than 0' });
    }

    const transaction = new Transaction({
      userId: req.user._id,
      description,
      category,
      type,
      amount: parseFloat(amount),
      date: date ? new Date(date) : new Date()
    });

    await transaction.save();
    res.status(201).json({ message: 'Transaction added successfully', transaction });
  } catch (error) {
    console.error('Add transaction error:', error);
    res.status(500).json({ message: 'Error adding transaction' });
  }
});

router.delete('/transactions/:id', authenticateToken, async (req, res) => {
  try {
    const transaction = await Transaction.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    res.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    console.error('Delete transaction error:', error);
    res.status(500).json({ message: 'Error deleting transaction' });
  }
});

// Settings Routes
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
    
    if (!settings) {
      settings = new Settings({ userId: req.user._id });
    }

    if (monthlyBudget !== undefined) settings.monthlyBudget = monthlyBudget;
    if (notifications !== undefined) settings.notifications = notifications;

    await settings.save();
    res.json({ message: 'Settings updated successfully', settings });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ message: 'Error updating settings' });
  }
});

// Analytics Routes
router.get('/analytics/summary', authenticateToken, async (req, res) => {
  try {
    const { month, year } = req.query;
    const currentDate = new Date();
    const targetMonth = month ? parseInt(month) - 1 : currentDate.getMonth();
    const targetYear = year ? parseInt(year) : currentDate.getFullYear();

    const startDate = new Date(targetYear, targetMonth, 1);
    const endDate = new Date(targetYear, targetMonth + 1, 0);

    const transactions = await Transaction.find({
      userId: req.user._id,
      date: { $gte: startDate, $lte: endDate }
    });

    const income = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const expenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const balance = income - expenses;

    // Category breakdown
    const categoryBreakdown = {};
    transactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        categoryBreakdown[t.category] = (categoryBreakdown[t.category] || 0) + t.amount;
      });

    // Get user settings for budget comparison
    const settings = await Settings.findOne({ userId: req.user._id });
    const monthlyBudget = settings?.monthlyBudget || 50000;

    res.json({
      income,
      expenses,
      balance,
      monthlyBudget,
      categoryBreakdown,
      savingsRate: income > 0 ? ((balance / income) * 100).toFixed(1) : 0,
      budgetUsed: monthlyBudget > 0 ? ((expenses / monthlyBudget) * 100).toFixed(1) : 0
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ message: 'Error fetching analytics' });
  }
});

// Clear all transactions (for settings page)
router.delete('/transactions', authenticateToken, async (req, res) => {
  try {
    const result = await Transaction.deleteMany({ userId: req.user._id });
    res.json({ 
      message: `${result.deletedCount} transactions deleted successfully`,
      deletedCount: result.deletedCount 
    });
  } catch (error) {
    console.error('Clear transactions error:', error);
    res.status(500).json({ message: 'Error clearing transactions' });
  }
});

export default router;
