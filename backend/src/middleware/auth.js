'use strict';

const { verifyToken } = require('../utils/jwt');
const User = require('../models/User');

/**
 * Middleware to authenticate requests using a Bearer JWT token.
 * Attaches the decoded user object to req.user if valid.
 */
async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
      });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Token is missing.',
      });
    }

    const decoded = verifyToken(token);

    // Fetch the current user from DB to ensure they still exist
    const user = await User.findById(decoded.id).select('name email avatar phone');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. User no longer exists.',
      });
    }

    req.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar
    };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired. Please log in again.',
      });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.',
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Authentication error.',
      error: err.message,
    });
  }
}

module.exports = { authenticateToken };
