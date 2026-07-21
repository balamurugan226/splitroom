'use strict';

const express = require('express');
const router = express.Router();
const {
  getExpenses,
  addExpense,
  getExpenseById,
  updateExpense,
  deleteExpense,
  getExpenseSummary,
  getRecurringBills,
  addRecurringBill,
  deleteRecurringBill,
} = require('../controllers/expenseController');

// All expense routes require auth (applied in app.js)

router.get('/', getExpenses);
router.post('/', addExpense);
router.get('/summary', getExpenseSummary);

router.get('/recurring', getRecurringBills);
router.post('/recurring', addRecurringBill);
router.delete('/recurring/:id', deleteRecurringBill);

router.get('/:id', getExpenseById);
router.put('/:id', updateExpense);
router.delete('/:id', deleteExpense);

module.exports = router;
