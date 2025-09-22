const mongoose = require('mongoose');

const budgetEntrySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    category: { type: String, required: true, trim: true },
    amount: { type: Number, required: true },
    date: { type: Date, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.models.BudgetEntry || mongoose.model('BudgetEntry', budgetEntrySchema);


