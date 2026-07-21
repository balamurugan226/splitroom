const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema({
  houseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'House',
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  color: {
    type: String,
    default: '#fffbeb', // default yellow HSL/Hex
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('Notice', noticeSchema);
