const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  description: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  houseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'House',
    required: true,
  },
  paidBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  splitAmong: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    amount: Number
  }],
  split_type: {
    type: String,
    enum: ['equal', 'percentage', 'custom'],
    default: 'equal'
  },
  receipt_image: String,
  notes: String,
  date: {
    type: Date,
    default: Date.now,
  }
}, { timestamps: true });

module.exports = mongoose.model('Expense', expenseSchema);
