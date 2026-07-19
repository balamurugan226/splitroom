'use strict';

const User = require('../models/User');
const House = require('../models/House');
const { hashPassword, comparePassword } = require('../utils/password');
const { generateToken } = require('../utils/jwt');
const { v4: uuidv4 } = require('uuid');

/**
 * POST /api/auth/register
 * Register a new user.
 */
async function register(req, res) {
  try {
    const { name, email, password, phone } = req.body;

    // Validation
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Name is required.' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ success: false, message: 'Invalid email format.' });
    }
    if (!password) {
      return res.status(400).json({ success: false, message: 'Password is required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email: email.trim().toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Insert user
    const user = new User({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
    });
    await user.save();

    // Generate JWT
    const token = generateToken({ id: user._id, email: user.email });

    return res.status(201).json({
      success: true,
      message: 'Registration successful.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    console.error('[register]', err);
    return res.status(500).json({ success: false, message: 'Server error during registration.', error: err.message });
  }
}

/**
 * POST /api/auth/login
 * Authenticate a user and return a JWT.
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }
    if (!password) {
      return res.status(400).json({ success: false, message: 'Password is required.' });
    }

    // Find user by email
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // Compare password
    const passwordMatch = await comparePassword(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // Generate JWT
    const token = generateToken({ id: user._id, email: user.email });

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    console.error('[login]', err);
    return res.status(500).json({ success: false, message: 'Server error during login.', error: err.message });
  }
}

/**
 * POST /api/auth/forgot-password
 * Generate and store a password reset token.
 */
async function forgotPassword(req, res) {
  try {
    const { email } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      // Do not reveal whether email exists for security
      return res.status(200).json({ success: true, message: 'Reset token logged to console (if account exists).' });
    }

    const resetToken = uuidv4();
    // Simulate updating reset token since we didn't add it to schema, or just log it
    console.log(`Password reset token for ${user.email}: ${resetToken}`);

    return res.status(200).json({
      success: true,
      message: 'Reset token logged to console.',
    });
  } catch (err) {
    console.error('[forgotPassword]', err);
    return res.status(500).json({ success: false, message: 'Server error.', error: err.message });
  }
}

/**
 * GET /api/auth/profile
 * Get the authenticated user's full profile.
 */
async function getProfile(req, res) {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Get house membership info
    const houses = await House.find({ members: userId });

    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        houses: houses.map(h => ({
          house_id: h._id,
          house_name: h.name,
        })),
      },
    });
  } catch (err) {
    console.error('[getProfile]', err);
    return res.status(500).json({ success: false, message: 'Server error.', error: err.message });
  }
}

/**
 * PUT /api/auth/profile
 * Update user profile fields.
 */
async function updateProfile(req, res) {
  try {
    const userId = req.user.id;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Name is required.' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    user.name = name.trim();
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    console.error('[updateProfile]', err);
    return res.status(500).json({ success: false, message: 'Server error.', error: err.message });
  }
}

/**
 * PUT /api/auth/change-password
 * Change the authenticated user's password.
 */
async function changePassword(req, res) {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword) {
      return res.status(400).json({ success: false, message: 'Current password is required.' });
    }
    if (!newPassword) {
      return res.status(400).json({ success: false, message: 'New password is required.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });
    }

    const userRecord = await User.findById(userId);
    if (!userRecord) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const isMatch = await comparePassword(currentPassword, userRecord.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
    }

    const hashedNew = await hashPassword(newPassword);
    userRecord.password = hashedNew;
    await userRecord.save();

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully.',
    });
  } catch (err) {
    console.error('[changePassword]', err);
    return res.status(500).json({ success: false, message: 'Server error.', error: err.message });
  }
}

module.exports = {
  register,
  login,
  forgotPassword,
  getProfile,
  updateProfile,
  changePassword,
};
