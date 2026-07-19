const mongoose = require('mongoose');

const houseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  address: String,
  monthly_rent: {
    type: Number,
    default: 0
  },
  security_deposit: {
    type: Number,
    default: 0
  },
  invite_code: {
    type: String,
    unique: true
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  }
}, { timestamps: true });

module.exports = mongoose.model('House', houseSchema);
