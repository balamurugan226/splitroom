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
    }).populate('paidBy', 'name').populate('paidTo', 'name').sort({ date: -1, createdAt: -1 });

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
    if (!amount) return res.status(400).json({ success: false, message: 'amount is required.' });

    const payment = new Transaction({
      houseId,
      type: 'transfer',
      description: `Transfer to roommate`,
      amount: Number(amount),
      paidBy: userId,
      paidTo: to_user,
      notes: note,
      status: 'pending'
    });

    await payment.save();
    
    const populated = await Transaction.findById(payment._id).populate('paidBy', 'name').populate('paidTo', 'name');

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

    const payment = await Transaction.findById(paymentId);
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

    const house = await House.findById(houseId).populate('members', 'name avatar budget_limit');
    const transactions = await Transaction.find({ houseId });

    // Initialize balances map
    const netBalances = {};
    for (const member of house.members) {
      netBalances[member._id.toString()] = 0;
    }

    // Loop through all transactions to calculate aggregate Net Balance for each user
    transactions.forEach(tx => {
      const payerId = tx.paidBy.toString();
      const amt = Number(tx.amount || 0);

      // Check if user exists in house
      if (netBalances[payerId] === undefined) return;

      if (tx.type === 'expense') {
        netBalances[payerId] += amt;
        tx.splitAmong.forEach(s => {
          const splitUserId = s.user.toString();
          if (netBalances[splitUserId] !== undefined) {
            netBalances[splitUserId] -= Number(s.amount || 0);
          }
        });
      } else if (tx.type === 'transfer' || tx.type === 'settlement') {
        const recipientId = tx.paidTo?.toString();
        if (recipientId && netBalances[recipientId] !== undefined) {
          // Payer paid money -> their net balance increases (owed more/owes less)
          netBalances[payerId] += amt;
          // Recipient received money -> their net balance decreases (owes more/owed less)
          netBalances[recipientId] -= amt;
        }
      }
    });

    // Match Debtors & Creditors using Greedy Debt Minimization
    const debtors = [];
    const creditors = [];

    for (const member of house.members) {
      const balance = parseFloat(netBalances[member._id.toString()].toFixed(2));
      if (balance < -0.01) {
        debtors.push({ id: member._id.toString(), name: member.name, avatar: member.avatar, balance });
      } else if (balance > 0.01) {
        creditors.push({ id: member._id.toString(), name: member.name, avatar: member.avatar, balance });
      }
    }

    // Sort to prioritize large debts
    debtors.sort((a, b) => a.balance - b.balance); // most negative first
    creditors.sort((a, b) => b.balance - a.balance); // most positive first

    const simplifiedTransfers = [];
    let dIdx = 0;
    let cIdx = 0;

    const dBalances = debtors.map(d => ({ ...d, balance: Math.abs(d.balance) }));
    const cBalances = creditors.map(c => ({ ...c, balance: c.balance }));

    while (dIdx < dBalances.length && cIdx < cBalances.length) {
      const debtor = dBalances[dIdx];
      const creditor = cBalances[cIdx];

      const amount = Math.min(debtor.balance, creditor.balance);

      simplifiedTransfers.push({
        from: debtor.id,
        from_name: debtor.name,
        from_avatar: debtor.avatar,
        to: creditor.id,
        to_name: creditor.name,
        to_avatar: creditor.avatar,
        amount: parseFloat(amount.toFixed(2))
      });

      debtor.balance -= amount;
      creditor.balance -= amount;

      if (debtor.balance < 0.01) dIdx++;
      if (creditor.balance < 0.01) cIdx++;
    }

    // Now format balances list for the logged-in user specifically
    const userNet = parseFloat((netBalances[userId] || 0).toFixed(2));
    let userOwed = 0;
    let userOwe = 0;

    const formattedBalances = house.members
      .filter(m => m._id.toString() !== userId)
      .map(member => {
        const mId = member._id.toString();
        
        // Find if there is a simplified transfer involving this member and the logged-in user
        let balanceValue = 0;

        const payingToThem = simplifiedTransfers.find(t => t.from === userId && t.to === mId);
        const theyOweMe = simplifiedTransfers.find(t => t.from === mId && t.to === userId);

        if (payingToThem) {
          balanceValue = -payingToThem.amount;
          userOwe += payingToThem.amount;
        } else if (theyOweMe) {
          balanceValue = theyOweMe.amount;
          userOwed += theyOweMe.amount;
        }

        return {
          user_id: member._id,
          name: member.name,
          avatar: member.avatar,
          balance: balanceValue
        };
      });

    return res.status(200).json({
      success: true,
      my_balance: userNet,
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
    }).populate('paidBy', 'name').populate('paidTo', 'name').sort({ date: -1, createdAt: -1 });

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
    if (!amount) return res.status(400).json({ success: false, message: 'amount is required.' });

    const settlement = new Transaction({
      houseId,
      type: 'settlement',
      description: `Settled up balances`,
      amount: Number(amount),
      paidBy: userId,
      paidTo: to_user,
      notes: note,
      status: 'paid'
    });

    await settlement.save();

    // Mark all pending transfers between them as completed
    await Transaction.updateMany(
      { paidBy: userId, paidTo: to_user, houseId, type: 'transfer', status: 'pending' },
      { $set: { status: 'paid' } }
    );

    const populated = await Transaction.findById(settlement._id)
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
 * Mock methods for rent routes as rent records are deprecated
 */
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
