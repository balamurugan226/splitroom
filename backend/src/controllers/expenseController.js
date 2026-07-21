'use strict';

const Expense = require('../models/Expense');
const House = require('../models/House');
const mongoose = require('mongoose');

async function getUserHouseId(userId) {
  const house = await House.findOne({ members: userId });
  return house ? house._id : null;
}

/**
 * GET /api/expenses
 */
async function getExpenses(req, res) {
  try {
    const userId = req.user.id;
    const houseId = await getUserHouseId(userId);
    if (!houseId) {
      return res.status(403).json({ success: false, message: 'You are not a member of any house.' });
    }

    const { category, page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    let query = { houseId };
    if (category) {
      query.category = category;
    }

    const total = await Expense.countDocuments(query);
    const expenses = await Expense.find(query)
      .populate('paidBy', 'name avatar')
      .populate('splitAmong.user', 'name avatar')
      .sort({ date: -1 })
      .skip(offset)
      .limit(parseInt(limit, 10));

    return res.status(200).json({
      success: true,
      expenses,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        pages: Math.ceil(total / parseInt(limit, 10)),
      },
    });
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
      member_ids,
      shares: sharesInput,
    } = req.body;

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

    if (split_type === 'equal') {
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
    } else if (split_type === 'percentage') {
      let runningTotal = 0;
      splitAmong = sharesInput.map((s, idx) => {
        let shareAmount = parseFloat((totalAmount * Number(s.percentage) / 100).toFixed(2));
        if (idx === sharesInput.length - 1) {
          shareAmount = parseFloat((totalAmount - runningTotal).toFixed(2));
        }
        runningTotal += parseFloat((totalAmount * Number(s.percentage) / 100).toFixed(2));
        return { user: s.user_id, amount: shareAmount };
      });
    } else if (split_type === 'custom') {
      splitAmong = sharesInput.map(s => ({
        user: s.user_id,
        amount: parseFloat(Number(s.amount).toFixed(2)),
      }));
    }

    const expense = new Expense({
      description: description.trim(),
      amount: totalAmount,
      category: category.trim(),
      houseId,
      paidBy: paid_by,
      splitAmong,
      split_type,
      receipt_image,
      notes,
      date: expense_date ? new Date(expense_date) : Date.now()
    });

    await expense.save();
    
    const populated = await Expense.findById(expense._id)
      .populate('paidBy', 'name avatar')
      .populate('splitAmong.user', 'name avatar');

    return res.status(201).json({
      success: true,
      message: 'Expense added successfully.',
      expense: populated,
    });
  } catch (err) {
    console.error('[addExpense]', err);
    return res.status(500).json({ success: false, message: 'Server error.', error: err.message });
  }
}

/**
 * GET /api/expenses/:id
 */
async function getExpenseById(req, res) {
  try {
    const userId = req.user.id;
    const expenseId = req.params.id;
    const houseId = await getUserHouseId(userId);

    if (!houseId) {
      return res.status(403).json({ success: false, message: 'You are not a member of any house.' });
    }

    const expense = await Expense.findOne({ _id: expenseId, houseId })
      .populate('paidBy', 'name avatar')
      .populate('splitAmong.user', 'name avatar');

    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found.' });
    }

    return res.status(200).json({ success: true, expense });
  } catch (err) {
    console.error('[getExpenseById]', err);
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

    const expense = await Expense.findById(expenseId);
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
      member_ids,
      shares: sharesInput,
    } = req.body;

    if (description) expense.description = description.trim();
    if (amount) expense.amount = Number(amount);
    if (category) expense.category = category.trim();
    if (split_type) expense.split_type = split_type;
    if (receipt_image !== undefined) expense.receipt_image = receipt_image;
    if (notes !== undefined) expense.notes = notes;
    if (expense_date) expense.date = new Date(expense_date);

    if (member_ids && member_ids.length > 0) {
      const totalAmount = expense.amount;
      let splitAmong = [];
      if (expense.split_type === 'equal') {
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
      } else if (expense.split_type === 'percentage' && sharesInput) {
        let runningTotal = 0;
        splitAmong = sharesInput.map((s, idx) => {
          let shareAmount = parseFloat((totalAmount * Number(s.percentage) / 100).toFixed(2));
          if (idx === sharesInput.length - 1) {
            shareAmount = parseFloat((totalAmount - runningTotal).toFixed(2));
          }
          runningTotal += parseFloat((totalAmount * Number(s.percentage) / 100).toFixed(2));
          return { user: s.user_id, amount: shareAmount };
        });
      } else if (expense.split_type === 'custom' && sharesInput) {
        splitAmong = sharesInput.map(s => ({ user: s.user_id, amount: Number(s.amount) }));
      }
      expense.splitAmong = splitAmong;
    }

    await expense.save();

    const populated = await Expense.findById(expense._id)
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

    const expense = await Expense.findById(expenseId);
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found.' });
    }
    
    // Simplification for delete permissions
    if (expense.paidBy.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'Only the person who paid can delete this expense.' });
    }

    await Expense.deleteOne({ _id: expenseId });

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
      return res.status(403).json({ success: false, message: 'You are not a member of any house.' });
    }

    const expenses = await Expense.find({ houseId });

    let totalThisMonth = 0;
    let userShareThisMonth = 0;
    let userPaidThisMonth = 0;

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

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

    const recentExpensesRaw = await Expense.find({ houseId })
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

module.exports = {
  getExpenses,
  addExpense,
  getExpenseById,
  updateExpense,
  deleteExpense,
  getExpenseSummary,
};
