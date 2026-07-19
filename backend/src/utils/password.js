'use strict';

const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 10;

/**
 * Hash a plaintext password using bcrypt.
 * @param {string} password - The plaintext password to hash
 * @returns {Promise<string>} The bcrypt hash
 */
async function hashPassword(password) {
  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  return hash;
}

/**
 * Compare a plaintext password against a bcrypt hash.
 * @param {string} password - Plaintext password to check
 * @param {string} hash - The bcrypt hash stored in the database
 * @returns {Promise<boolean>} True if they match, false otherwise
 */
async function comparePassword(password, hash) {
  const match = await bcrypt.compare(password, hash);
  return match;
}

module.exports = { hashPassword, comparePassword };
