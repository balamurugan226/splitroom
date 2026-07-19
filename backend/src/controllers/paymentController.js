'use strict';

const Payment = require('../models/Payment');
const Settlement = require('../models/Settlement');
const House = require('../models/House');
const Expense = require('../models/Expense');
const User = require('../models/User');
const mongoose = require('mongoose');

async function getUserHouseId(userId) {
  const house = await House.findOne({ members: userId });
  return house ? house._id : null;
}

/**
 * GET /api/payments
 */
async function getPayments(req, res) {
  try {
    const userId = req.user.id;
    const houseId = await getUserHouseId(userId);
    if (!houseId) {
      return res.status(403).json({ success: false, message: 'You are not a member of any house.' });
    }

    const payments = await Payment.find({
      houseId,
      $or: [{ paidBy: userId }, { paidTo: userId }]
    }).populate('paidBy', 'name').populate('paidTo', 'name').sort({ date: -1 });

    return res.status(200).json({ success: true, payments });
  } catch (err) {
    console.error('[getPayments]', err);
    return res.status(500).json({ success: false, message: 'Server error.', error: err.message });
  }
}

/**
 * POST /api/payments
 */
async function createPayment(req, res) {
  try {
    const userId = req.user.id;
    const houseId = await getUserHouseId(userId);
    if (!houseId) {
      return res.status(403).json({ success: false, message: 'You are not a member of any house.' });
    }

    const { to_user, amount, payment_type = 'expense', note } = req.body;

    if (!to_user) return res.status(400).json({ success: false, message: 'to_user is required.' });
    if (!amount) return res.status(400).json({ success: false, message: 'amount is required.' });

    const payment = new Payment({
      houseId,
      paidBy: userId,
      paidTo: to_user,
      amount: Number(amount),
      payment_type,
      note
    });

    await payment.save();
    
    const populated = await Payment.findById(payment._id).populate('paidBy', 'name').populate('paidTo', 'name');

    return res.status(201).json({
      success: true,
      message: 'Payment recorded successfully.',
      payment: populated,
    });
  } catch (err) {
    console.error('[createPayment]', err);
    return res.status(500).json({ success: false, message: 'Server error.', error: err.message });
  }
}

/**
 * PUT /api/payments/:id/mark-paid
 */
async function markPaid(req, res) {
  try {
    const userId = req.user.id;
    const paymentId = req.params.id;

    const payment = await Payment.findById(paymentId);
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found.' });

    if (payment.paidBy.toString() !== userId && payment.paidTo.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    payment.status = 'paid';
    await payment.save();

    return res.status(200).json({
      success: true,
      message: 'Payment marked as paid.',
      payment,
    });
  } catch (err) {
    console.error('[markPaid]', err);
    return res.status(500).json({ success: false, message: 'Server error.', error: err.message });
  }
}

/**
 * GET /api/payments/balances
 */
async function getBalances(req, res) {
  try {
    const userId = req.user.id;
    const houseId = await getUserHouseId(userId);
    if (!houseId) {
      return res.status(403).json({ success: false, message: 'You are not a member of any house.' });
    }

    const house = await House.findById(houseId).populate('members', 'name avatar');
    const expenses = await Expense.find({ houseId });
    const payments = await Payment.find({ houseId, status: 'pending' });

    const balances = [];

    for (const member of house.members) {
      if (member._id.toString() === userId) continue;

      let theyOweMe = 0;
      let iOweThem = 0;

      // Expenses paid by me, they owe their share
      expenses.forEach(exp => {
        if (exp.paidBy.toString() === userId) {
          const share = exp.splitAmong.find(s => s.user.toString() === member._id.toString());
          if (share) theyOweMe += share.amount;
        }
        // Expenses paid by them, I owe my share
        if (exp.paidBy.toString() === member._id.toString()) {
          const share = exp.splitAmong.find(s => s.user.toString() === userId);
          if (share) iOweThem += share.amount;
        }
      });

      // Payments pending
      let pendingIpaidThem = 0;
      let pendingTheySentMe = 0;
      payments.forEach(p => {
        if (p.paidBy.toString() === userId && p.paidTo.toString() === member._id.toString()) {
          pendingIpaidThem += p.amount;
        }
        if (p.paidBy.toString() === member._id.toString() && p.paidTo.toString() === userId) {
          pendingTheySentMe += p.amount;
        }
      });

      const net = (theyOweMe - iOweThem + pendingTheySentMe - pendingIpaidThem).toFixed(2);

      balances.push({
        user_id: member._id,
        name: member.name,
        avatar: member.avatar,
        balance: parseFloat(net),
        they_owe_me: theyOweMe,
        i_owe_them: iOweThem,
      });
    }

    return res.status(200).json({ success: true, balances });
  } catch (err) {
    console.error('[getBalances]', err);
    return res.status(500).json({ success: false, message: 'Server error.', error: err.message });
  }
}

/**
 * GET /api/payments/settlements
 */
async function getSettlements(req, res) {
  try {
    const userId = req.user.id;
    const houseId = await getUserHouseId(userId);
    if (!houseId) {
      return res.status(403).json({ success: false, message: 'You are not a member of any house.' });
    }

    const settlements = await Settlement.find({ houseId })
      .populate('paidBy', 'name').populate('paidTo', 'name').sort({ date: -1 });

    return res.status(200).json({ success: true, settlements });
  } catch (err) {
    console.error('[getSettlements]', err);
    return res.status(500).json({ success: false, message: 'Server error.', error: err.message });
  }
}

/**
 * POST /api/payments/settlements
 */
async function createSettlement(req, res) {
  try {
    const userId = req.user.id;
    const houseId = await getUserHouseId(userId);
    if (!houseId) {
      return res.status(403).json({ success: false, message: 'You are not a member of any house.' });
    }

    const { to_user, amount, note } = req.body;

    const settlement = new Settlement({
      houseId,
      paidBy: userId,
      paidTo: to_user,
      amount: Number(amount),
      note
    });

    await settlement.save();

    await Payment.updateMany(
      { paidBy: userId, paidTo: to_user, houseId, status: 'pending' },
      { $set: { status: 'settled' } }
    );

    const populated = await Settlement.findById(settlement._id)
      .populate('paidBy', 'name').populate('paidTo', 'name');

    return res.status(201).json({
      success: true,
      message: 'Settlement created successfully.',
      settlement: populated,
    });
  } catch (err) {
    console.error('[createSettlement]', err);
    return res.status(500).json({ success: false, message: 'Server error.', error: err.message });
  }
}

/**
 * Mock methods for rent routes as rent records are deprecated in MongoDB version
 */
function getRentRecords(req, res) {
  return res.status(200).json({ success: true, rent_records: [] });
}

function createRentRecord(req, res) {
  return res.status(400).json({ success: false, message: 'Rent records not supported in MongoDB version.' });
}

function updateRentStatus(req, res) {
  return res.status(400).json({ success: false, message: 'Rent records not supported in MongoDB version.' });
}

module.exports = {
  getPayments,
  createPayment,
  markPaid,
  getBalances,
  getSettlements,
  createSettlement,
  getRentRecords,
  createRentRecord,
  updateRentStatus,
};
