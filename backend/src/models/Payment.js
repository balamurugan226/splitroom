const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  amount: {
    type: Number,
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
  paidTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  payment_type: {
    type: String,
    default: 'expense'
  },
  status: {
    type: String,
    default: 'pending'
  },
  note: String,
  date: {
    type: Date,
    default: Date.now,
  }
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
