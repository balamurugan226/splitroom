const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  houseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'House',
    required: true,
  },
  type: {
    type: String,
    enum: ['expense', 'transfer', 'settlement'],
    required: true,
  },
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
    default: 'other',
  },
  paidBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // Split details (for expenses)
  splitAmong: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    amount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'paid'],
      default: 'pending',
    }
  }],
  // Recipient details (for transfers and settlements)
  paidTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'settled'],
    default: 'pending',
  },
  notes: {
    type: String,
    default: '',
  },
  receipt_image: {
    type: String,
    default: null,
  },
  date: {
    type: Date,
    default: Date.now,
  }
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);
