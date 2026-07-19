const mongoose = require('mongoose');

const settlementSchema = new mongoose.Schema({
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
  amount: {
    type: Number,
    required: true,
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

module.exports = mongoose.model('Settlement', settlementSchema);
