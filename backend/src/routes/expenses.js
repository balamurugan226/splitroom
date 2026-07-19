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
} = require('../controllers/expenseController');

// All expense routes require auth (applied in app.js)

router.get('/', getExpenses);
router.post('/', addExpense);
router.get('/summary', getExpenseSummary);
router.get('/:id', getExpenseById);
router.put('/:id', updateExpense);
router.delete('/:id', deleteExpense);

module.exports = router;
