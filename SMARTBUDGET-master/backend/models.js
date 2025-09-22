import mongoose from 'mongoose';

// User Schema
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  passwordHash: {
    type: String,
    required: true,
    minlength: 6
  }
}, {
  timestamps: true
});

// Transaction Schema
const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  category: {
    type: String,
    required: true,
    enum: [
      'Income', 'Groceries', 'Dining', 'Transportation', 'Housing', 
      'Utilities', 'Healthcare', 'Entertainment', 'Shopping', 
      'Education', 'Travel', 'Insurance', 'Savings', 'Other'
    ]
  },
  type: {
    type: String,
    required: true,
    enum: ['income', 'expense']
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  }
}, {
  timestamps: true
});

// Settings Schema
const settingsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  monthlyBudget: {
    type: Number,
    default: 50000,
    min: 0
  },
  currency: {
    type: String,
    default: '₹'
  },
  notifications: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Create indexes for better performance
transactionSchema.index({ userId: 1, date: -1 });
transactionSchema.index({ userId: 1, category: 1 });

export const User = mongoose.model('User', userSchema);
export const Transaction = mongoose.model('Transaction', transactionSchema);
export const Settings = mongoose.model('Settings', settingsSchema);

// Budget Schema
const budgetCategorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  type: { type: String, enum: ['income','expense'], required: true },
  limit: { type: Number, required: true, min: 0 },
}, { _id: false });

const budgetSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  categories: { type: [budgetCategorySchema], default: [] },
}, { timestamps: true });

export const Budget = mongoose.model('Budget', budgetSchema);
