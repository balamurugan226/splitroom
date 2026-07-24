'use strict';

const Transaction = require('../models/Transaction');
const House = require('../models/House');
const User = require('../models/User');

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
      return res.status(200).json({ success: true, payments: [] });
    }

    const payments = await Transaction.find({
      houseId,
      type: { $in: ['transfer', 'settlement'] }
    }).populate('paidBy', 'name avatar').populate('paidTo', 'name avatar').sort({ date: -1, createdAt: -1 });

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

    const { to_user, amount, note } = req.body;

    if (!to_user) return res.status(400).json({ success: false, message: 'to_user is required.' });
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Valid positive amount is required.' });
    }

    const targetUser = (to_user._id || to_user).toString();
    if (targetUser === userId.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot record payment to yourself.' });
    }

    const payment = new Transaction({
      houseId,
      type: 'transfer',
      description: note ? `Transfer: ${note}` : `Transfer to roommate`,
      amount: Number(amount),
      paidBy: userId,
      paidTo: targetUser,
      notes: note || '',
      status: 'paid'
    });

    await payment.save();
    
    const populated = await Transaction.findById(payment._id)
      .populate('paidBy', 'name avatar')
      .populate('paidTo', 'name avatar');

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
    const userId = req.user.id.toString();
    const paymentId = req.params.id;

    const payment = await Transaction.findById(paymentId);
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found.' });

    const payer = (payment.paidBy?._id || payment.paidBy)?.toString();
    const recipient = (payment.paidTo?._id || payment.paidTo)?.toString();

    if (payer !== userId && recipient !== userId) {
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
 * Calculates exact pair-wise roommate balances for absolute precision.
 * Payment from X to Y reduces X's debt to Y directly without affecting third parties (e.g. house owner).
 */
async function getBalances(req, res) {
  try {
    const userId = req.user.id.toString();
    const houseId = await getUserHouseId(userId);
    if (!houseId) {
      return res.status(403).json({ success: false, message: 'You are not a member of any house.' });
    }

    const house = await House.findById(houseId).populate('members', 'name avatar budget_limit');
    if (!house) {
      return res.status(404).json({ success: false, message: 'House not found.' });
    }

    const transactions = await Transaction.find({ houseId });

    // Initialize pairwise balance matrix for all house members
    // pairwise[m1][m2] represents the net amount m2 owes m1
    const pairwise = {};
    house.members.forEach(m1 => {
      const id1 = m1._id.toString();
      pairwise[id1] = {};
      house.members.forEach(m2 => {
        const id2 = m2._id.toString();
        pairwise[id1][id2] = 0;
      });
    });

    transactions.forEach(tx => {
      const payerId = (tx.paidBy?._id || tx.paidBy)?.toString();
      if (!payerId || !pairwise[payerId]) return;

      const amt = Number(tx.amount || 0);

      if (tx.type === 'expense') {
        if (Array.isArray(tx.splitAmong)) {
          tx.splitAmong.forEach(s => {
            const splitUserId = (s.user?._id || s.user)?.toString();
            if (splitUserId && splitUserId !== payerId && pairwise[payerId][splitUserId] !== undefined) {
              const shareAmt = Number(s.amount || 0);
              // splitUserId owes payerId shareAmt
              pairwise[payerId][splitUserId] += shareAmt;
              pairwise[splitUserId][payerId] -= shareAmt;
            }
          });
        }
      } else if (tx.type === 'transfer' || tx.type === 'settlement') {
        const recipientId = (tx.paidTo?._id || tx.paidTo)?.toString();
        if (recipientId && recipientId !== payerId && pairwise[payerId] && pairwise[payerId][recipientId] !== undefined) {
          // payerId paid money to recipientId -> recipientId owes payerId less (or payerId owes recipientId less)
          pairwise[payerId][recipientId] += amt;
          pairwise[recipientId][payerId] -= amt;
        }
      }
    });

    let userOwed = 0; // Total amount owed TO logged-in user
    let userOwe = 0;  // Total amount logged-in user OWES to others

    const formattedBalances = house.members
      .filter(m => m._id.toString() !== userId)
      .map(member => {
        const mId = member._id.toString();
        const netValue = parseFloat((pairwise[userId][mId] || 0).toFixed(2));

        if (netValue > 0) {
          userOwed += netValue;
        } else if (netValue < 0) {
          userOwe += Math.abs(netValue);
        }

        return {
          user_id: member._id,
          name: member.name,
          avatar: member.avatar,
          balance: netValue // positive = they owe logged-in user, negative = logged-in user owes them
        };
      });

    const totalNetBalance = parseFloat((userOwed - userOwe).toFixed(2));

    return res.status(200).json({
      success: true,
      my_balance: totalNetBalance,
      owed_to_me: parseFloat(userOwed.toFixed(2)),
      i_owe: parseFloat(userOwe.toFixed(2)),
      balances: formattedBalances
    });
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
      return res.status(200).json({ success: true, settlements: [] });
    }

    const settlements = await Transaction.find({
      houseId,
      type: 'settlement'
    }).populate('paidBy', 'name avatar').populate('paidTo', 'name avatar').sort({ date: -1, createdAt: -1 });

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

    if (!to_user) return res.status(400).json({ success: false, message: 'to_user is required.' });
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Valid positive amount is required.' });
    }

    const targetUser = (to_user._id || to_user).toString();
    if (targetUser === userId.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot record settlement with yourself.' });
    }

    const settlement = new Transaction({
      houseId,
      type: 'settlement',
      description: note ? `Settlement: ${note}` : `Settled up balances`,
      amount: Number(amount),
      paidBy: userId,
      paidTo: targetUser,
      notes: note || '',
      status: 'paid'
    });

    await settlement.save();

    const populated = await Transaction.findById(settlement._id)
      .populate('paidBy', 'name avatar')
      .populate('paidTo', 'name avatar');

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

function getRentRecords(req, res) {
  return res.status(200).json({ success: true, rent_records: [] });
}

function createRentRecord(req, res) {
  return res.status(400).json({ success: false, message: 'Rent records not supported.' });
}

function updateRentStatus(req, res) {
  return res.status(400).json({ success: false, message: 'Rent records not supported.' });
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
