'use strict';

const express = require('express');
const router = express.Router();
const {
  getPayments,
  createPayment,
  markPaid,
  getBalances,
  getSettlements,
  createSettlement,
  getRentRecords,
  createRentRecord,
  updateRentStatus,
} = require('../controllers/paymentController');

// All payment routes require auth (applied in app.js)

// Specific named routes MUST come before /:id wildcard routes
router.get('/balances', getBalances);

router.get('/rent', getRentRecords);
router.post('/rent', createRentRecord);
router.put('/rent/:id', updateRentStatus);

router.get('/settlements', getSettlements);
router.post('/settlements', createSettlement);

router.get('/', getPayments);
router.post('/', createPayment);
router.put('/:id/mark-paid', markPaid);

module.exports = router;
