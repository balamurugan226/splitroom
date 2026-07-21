'use strict';

const Transaction = require('../models/Transaction');
const House = require('../models/House');
const RecurringBill = require('../models/RecurringBill');
const mongoose = require('mongoose');

async function getUserHouseId(userId) {
  const house = await House.findOne({ members: userId });
  return house ? house._id : null;
}

/**
 * Automatically check and post active recurring bills for the current month
 */
async function checkAndPostRecurringBills(houseId) {
  try {
    const recurring = await RecurringBill.find({ houseId, active: true });
    if (recurring.length === 0) return;

    const now = new Date();
    const currentMonthStr = now.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }); // E.g. "Jul 2026"
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    for (const bill of recurring) {
      // Check if already posted for the current month
      const alreadyPosted = await Transaction.findOne({
        houseId,
        type: 'expense',
        description: `${bill.description} (${currentMonthStr})`,
        date: { $gte: startOfMonth, $lte: endOfMonth }
      });

      if (!alreadyPosted) {
        const totalAmount = bill.amount;
        const member_ids = bill.splitWith && bill.splitWith.length > 0 ? bill.splitWith : [bill.paidBy];
        let splitAmong = [];

        const equalAmount = parseFloat((totalAmount / member_ids.length).toFixed(2));
        let runningTotal = 0;
        splitAmong = member_ids.map((uid, idx) => {
          let shareAmount = equalAmount;
          if (idx === member_ids.length - 1) {
            shareAmount = parseFloat((totalAmount - runningTotal).toFixed(2));
          }
          runningTotal += equalAmount;
          return { user: uid, amount: shareAmount };
        });

        const tx = new Transaction({
          houseId,
          type: 'expense',
          description: `${bill.description} (${currentMonthStr})`,
          amount: totalAmount,
          category: bill.category || 'other',
          paidBy: bill.paidBy,
          splitAmong,
          date: new Date()
        });
        await tx.save();
      }
    }
  } catch (err) {
    console.error('Error posting recurring bills:', err);
  }
}

/**
 * GET /api/expenses
 */
async function getExpenses(req, res) {
  try {
    const userId = req.user.id;
    const { category, month } = req.query;

    const houseId = await getUserHouseId(userId);
    if (!houseId) {
      return res.status(200).json({ success: true, expenses: [] });
    }

    // Auto trigger check & post
    await checkAndPostRecurringBills(houseId);

    const query = { houseId, type: 'expense' };

    if (category && category !== 'all') {
      query.category = category;
    }

    if (month) {
      const [year, m] = month.split('-');
      const start = new Date(parseInt(year), parseInt(m) - 1, 1);
      const end = new Date(parseInt(year), parseInt(m), 0, 23, 59, 59);
      query.date = { $gte: start, $lte: end };
    }

    const expenses = await Transaction.find(query)
      .populate('paidBy', 'name avatar')
      .populate('splitAmong.user', 'name avatar')
      .sort({ date: -1, createdAt: -1 });

    return res.status(200).json({ success: true, expenses });
  } catch (err) {
    console.error('[getExpenses]', err);
    return res.status(500).json({ success: false, message: 'Server error.', error: err.message });
  }
}

/**
 * POST /api/expenses
 */
async function addExpense(req, res) {
  try {
    const userId = req.user.id;
    const houseId = await getUserHouseId(userId);
    if (!houseId) {
      return res.status(403).json({ success: false, message: 'You are not a member of any house.' });
    }

    const {
      description,
      amount,
      category,
      paid_by,
      split_type = 'equal',
      receipt_image,
      notes,
      expense_date,
      member_ids: rawMemberIds,
      split_with,
    } = req.body;

    const member_ids = rawMemberIds || split_with;

    if (!description || !description.trim()) {
      return res.status(400).json({ success: false, message: 'Description is required.' });
    }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Valid amount is required.' });
    }
    if (!category || !category.trim()) {
      return res.status(400).json({ success: false, message: 'Category is required.' });
    }
    if (!paid_by) {
      return res.status(400).json({ success: false, message: 'paid_by is required.' });
    }
    if (!member_ids || !Array.isArray(member_ids) || member_ids.length === 0) {
      return res.status(400).json({ success: false, message: 'member_ids array is required.' });
    }

    const totalAmount = Number(amount);
    let splitAmong = [];

    const equalAmount = parseFloat((totalAmount / member_ids.length).toFixed(2));
    let runningTotal = 0;
    splitAmong = member_ids.map((uid, idx) => {
      let shareAmount = equalAmount;
      if (idx === member_ids.length - 1) {
        shareAmount = parseFloat((totalAmount - runningTotal).toFixed(2));
      }
      runningTotal += equalAmount;
      return { user: uid, amount: shareAmount };
    });

    const expense = new Transaction({
      houseId,
      type: 'expense',
      description: description.trim(),
      amount: totalAmount,
      category: category.trim(),
      paidBy: paid_by,
      splitAmong,
      receipt_image,
      notes,
      date: expense_date ? new Date(expense_date) : Date.now()
    });

    await expense.save();

    const populated = await Transaction.findById(expense._id)
      .populate('paidBy', 'name avatar')
      .populate('splitAmong.user', 'name avatar');

    return res.status(201).json({
      success: true,
      message: 'Expense created successfully.',
      expense: populated,
    });
  } catch (err) {
    console.error('[addExpense]', err);
    return res.status(500).json({ success: false, message: 'Server error.', error: err.message });
  }
}

/**
 * PUT /api/expenses/:id
 */
async function updateExpense(req, res) {
  try {
    const userId = req.user.id;
    const expenseId = req.params.id;

    const houseId = await getUserHouseId(userId);
    if (!houseId) {
      return res.status(403).json({ success: false, message: 'You are not a member of any house.' });
    }

    const expense = await Transaction.findById(expenseId);
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found.' });
    }
    if (expense.paidBy.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'Only the person who paid can update this expense.' });
    }

    const {
      description,
      amount,
      category,
      split_type,
      receipt_image,
      notes,
      expense_date,
      member_ids: rawMemberIds,
      split_with,
    } = req.body;

    const member_ids = rawMemberIds || split_with;

    if (description) expense.description = description.trim();
    if (amount) expense.amount = Number(amount);
    if (category) expense.category = category.trim();
    if (receipt_image !== undefined) expense.receipt_image = receipt_image;
    if (notes !== undefined) expense.notes = notes;
    if (expense_date) expense.date = new Date(expense_date);

    if (member_ids && member_ids.length > 0) {
      const totalAmount = expense.amount;
      let splitAmong = [];
      const equalAmount = parseFloat((totalAmount / member_ids.length).toFixed(2));
      let runningTotal = 0;
      splitAmong = member_ids.map((uid, idx) => {
        let shareAmount = equalAmount;
        if (idx === member_ids.length - 1) {
          shareAmount = parseFloat((totalAmount - runningTotal).toFixed(2));
        }
        runningTotal += equalAmount;
        return { user: uid, amount: shareAmount };
      });
      expense.splitAmong = splitAmong;
    }

    await expense.save();

    const populated = await Transaction.findById(expense._id)
      .populate('paidBy', 'name avatar')
      .populate('splitAmong.user', 'name avatar');

    return res.status(200).json({
      success: true,
      message: 'Expense updated successfully.',
      expense: populated,
    });
  } catch (err) {
    console.error('[updateExpense]', err);
    return res.status(500).json({ success: false, message: 'Server error.', error: err.message });
  }
}

/**
 * DELETE /api/expenses/:id
 */
async function deleteExpense(req, res) {
  try {
    const userId = req.user.id;
    const expenseId = req.params.id;

    const houseId = await getUserHouseId(userId);
    if (!houseId) {
      return res.status(403).json({ success: false, message: 'You are not a member of any house.' });
    }

    const expense = await Transaction.findById(expenseId);
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found.' });
    }
    
    if (expense.paidBy.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'Only the person who paid can delete this expense.' });
    }

    await Transaction.deleteOne({ _id: expenseId });

    return res.status(200).json({ success: true, message: 'Expense deleted successfully.' });
  } catch (err) {
    console.error('[deleteExpense]', err);
    return res.status(500).json({ success: false, message: 'Server error.', error: err.message });
  }
}

/**
 * GET /api/expenses/summary
 */
async function getExpenseSummary(req, res) {
  try {
    const userId = req.user.id;
    const houseId = await getUserHouseId(userId);
    if (!houseId) {
      return res.status(200).json({
        success: true,
        summary: { total_this_month: 0, your_share_this_month: 0, you_paid_this_month: 0, recent_expenses: [] }
      });
    }

    // Auto trigger check & post
    await checkAndPostRecurringBills(houseId);

    const expenses = await Transaction.find({ houseId, type: 'expense' });

    let totalThisMonth = 0;
    let userShareThisMonth = 0;
    let userPaidThisMonth = 0;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    expenses.forEach(exp => {
      const expDate = new Date(exp.date);
      if (expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear) {
        totalThisMonth += exp.amount;
        if (exp.paidBy.toString() === userId) {
          userPaidThisMonth += exp.amount;
        }
        const share = exp.splitAmong.find(s => s.user.toString() === userId);
        if (share) {
          userShareThisMonth += share.amount;
        }
      }
    });

    const recentExpensesRaw = await Transaction.find({ houseId, type: 'expense' })
      .populate('paidBy', 'name')
      .sort({ date: -1, createdAt: -1 })
      .limit(5);

    const recentExpenses = recentExpensesRaw.map(exp => {
      const myShareObj = exp.splitAmong.find(s => s.user.toString() === userId);
      return {
        id: exp._id.toString(),
        description: exp.description,
        category: exp.category,
        amount: exp.amount,
        my_share: myShareObj ? myShareObj.amount : 0,
        paid_by_name: exp.paidBy ? exp.paidBy.name : 'Roommate',
        created_at: exp.date || exp.createdAt,
      };
    });

    return res.status(200).json({
      success: true,
      summary: {
        total_this_month: totalThisMonth,
        your_share_this_month: userShareThisMonth,
        you_paid_this_month: userPaidThisMonth,
        recent_expenses: recentExpenses,
      },
    });
  } catch (err) {
    console.error('[getExpenseSummary]', err);
    return res.status(500).json({ success: false, message: 'Server error.', error: err.message });
  }
}

// ---------------------------------------------------------------------------
// Recurring Bills API Controllers
// ---------------------------------------------------------------------------

async function getRecurringBills(req, res) {
  try {
    const userId = req.user.id;
    const houseId = await getUserHouseId(userId);
    if (!houseId) return res.status(200).json({ success: true, recurring: [] });

    const recurring = await RecurringBill.find({ houseId })
      .populate('paidBy', 'name')
      .populate('splitWith', 'name');

    return res.status(200).json({ success: true, recurring });
  } catch (err) {
    console.error('[getRecurringBills]', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

async function addRecurringBill(req, res) {
  try {
    const userId = req.user.id;
    const houseId = await getUserHouseId(userId);
    if (!houseId) return res.status(403).json({ success: false, message: 'Not member of any house.' });

    const { description, amount, category = 'other', paidBy, dueDay, splitWith } = req.body;

    if (!description || !amount || !dueDay) {
      return res.status(400).json({ success: false, message: 'Missing parameters.' });
    }

    const bill = new RecurringBill({
      houseId,
      description,
      amount: Number(amount),
      category,
      paidBy: paidBy || userId,
      dueDay: Number(dueDay),
      splitWith: splitWith || [userId]
    });

    await bill.save();
    return res.status(201).json({ success: true, bill });
  } catch (err) {
    console.error('[addRecurringBill]', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

async function deleteRecurringBill(req, res) {
  try {
    const userId = req.user.id;
    const houseId = await getUserHouseId(userId);
    if (!houseId) return res.status(403).json({ success: false, message: 'Forbidden' });

    await RecurringBill.deleteOne({ _id: req.params.id, houseId });
    return res.status(200).json({ success: true, message: 'Deleted recurring bill' });
  } catch (err) {
    console.error('[deleteRecurringBill]', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

async function getExpenseById(req, res) {
  try {
    const expense = await Transaction.findById(req.params.id)
      .populate('paidBy', 'name avatar')
      .populate('splitAmong.user', 'name avatar');
    if (!expense) return res.status(404).json({ success: false, message: 'Expense not found.' });
    return res.status(200).json({ success: true, expense });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

module.exports = {
  getExpenses,
  addExpense,
  getExpenseById,
  updateExpense,
  deleteExpense,
  getExpenseSummary,
  getRecurringBills,
  addRecurringBill,
  deleteRecurringBill,
};
