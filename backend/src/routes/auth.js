'use strict';

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  register,
  login,
  forgotPassword,
  getProfile,
  updateProfile,
  changePassword,
} = require('../controllers/authController');

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);

// Protected routes
router.get('/profile', authenticateToken, getProfile);
router.put('/profile', authenticateToken, updateProfile);
router.put('/change-password', authenticateToken, changePassword);

module.exports = router;
