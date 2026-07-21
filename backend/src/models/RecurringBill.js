const mongoose = require('mongoose');

const recurringBillSchema = new mongoose.Schema({
  houseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'House',
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
  dueDay: {
    type: Number,
    required: true, // day of the month (1-31)
  },
  splitWith: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  active: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('RecurringBill', recurringBillSchema);
