const express = require('express');
const cors = require('cors');
require('dotenv').config();
const connectDB = require('./config/db');

const mongoose = require('mongoose');
const User = require('./models/User');
const BudgetEntry = require('./models/BudgetEntry');
const { create } = require('xmlbuilder2');
const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB
connectDB();

let users = []; // In-memory user list (won't persist after restart)

// Signup route
app.post('/api/auth/signup', async (req, res) => {
  const { username, email, password } = req.body;
  try {
    if (mongoose.connection.readyState === 1) {
      const existing = await User.findOne({ email });
      if (existing) return res.status(400).json({ message: 'User already exists' });
      const created = await User.create({ username, email, password });
      return res.status(201).json({
        message: 'User created successfully',
        user: { id: created._id.toString(), username: created.username, email: created.email }
      });
    }

    // fallback to in-memory when DB not connected
    if (users.find(u => u.email === email)) {
      return res.status(400).json({ message: 'User already exists' });
    }
    const created = { id: String(users.length + 1), username, email, password };
    users.push(created);
    return res.status(201).json({ message: 'User created successfully', user: { id: created.id, username: created.username, email: created.email } });
  } catch (err) {
    console.error('Signup error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Login route
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    if (mongoose.connection.readyState === 1) {
      const user = await User.findOne({ email, password });
      if (!user) return res.status(400).json({ message: 'Invalid credentials' });
      return res.json({ message: 'Login successful', user: { id: user._id.toString(), username: user.username, email: user.email } });
    }

    // fallback to in-memory when DB not connected
    const user = users.find(u => u.email === email && u.password === password);
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });
    return res.json({ message: 'Login successful', user: { id: user.id, username: user.username, email: user.email } });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// List users (from MongoDB if connected, otherwise from in-memory array)
app.get('/api/users', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const docs = await User.find({}, { username: 1, email: 1 }).sort({ createdAt: -1 });
      const result = docs.map(d => ({ id: d._id.toString(), username: d.username, email: d.email }));
      return res.json({ users: result });
    }
    const result = users.map(u => ({ id: u.id, username: u.username, email: u.email }));
    return res.json({ users: result });
  } catch (err) {
    console.error('List users error:', err);
    return res.status(500).json({ message: 'Failed to list users' });
  }
});

// Export XML
app.get('/api/export/xml', async (req, res) => {
  try {
    // In this simple app, we take user from query or fallback to the first available user
    // In real apps, you'd authenticate and use req.user.id
    let userDoc = null;
    if (mongoose.connection.readyState === 1) {
      const email = req.query.email;
      userDoc = email ? await User.findOne({ email }) : await User.findOne();
    }
    if (!userDoc) {
      // Fallback: construct a temp user from localStorage-like param for demo
      return res.status(400).json({ message: 'User not found. Provide ?email=...' });
    }

    const entries = mongoose.connection.readyState === 1
      ? await BudgetEntry.find({ userId: userDoc._id }).sort({ date: 1 })
      : [];

    const root = create({ version: '1.0' })
      .ele('budget')
        .ele('user')
          .ele('id').txt(userDoc._id.toString()).up()
          .ele('name').txt(userDoc.username || '').up()
          .ele('email').txt(userDoc.email || '').up()
        .up()
        .ele('entries');

    entries.forEach((e) => {
      root.ele('entry', { id: e._id.toString() })
        .ele('category').txt(e.category).up()
        .ele('amount').txt(String(e.amount)).up()
        .ele('date').txt(new Date(e.date).toISOString()).up()
        .up();
    });

    const xml = root.end({ prettyPrint: true });
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', 'attachment; filename=budget.xml');
    return res.status(200).send(xml);
  } catch (err) {
    console.error('Export XML error:', err);
    return res.status(500).json({ message: 'Failed to export XML' });
  }
});

// Serve frontend build
const path = require('path');
const clientDistPath = path.join(__dirname, '..', 'SMARTBUDGET-master', 'dist');
app.use(express.static(clientDistPath));

// SPA fallback to index.html (exclude API routes)
app.get(/^\/(?!api\/).*/, (req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
