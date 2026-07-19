'use strict';

require('dotenv').config();
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'splitroom_jwt_secret_2024';
const TOKEN_EXPIRY = '7d';

/**
 * Generate a JWT token for the given payload.
 * @param {object} payload - Data to encode in the token (e.g. { id, email })
 * @returns {string} Signed JWT string
 */
function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

/**
 * Verify a JWT token and return the decoded payload.
 * @param {string} token - JWT string to verify
 * @returns {object} Decoded payload
 * @throws {Error} If token is invalid or expired
 */
function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

module.exports = { generateToken, verifyToken };
