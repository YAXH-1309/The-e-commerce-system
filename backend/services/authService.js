const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Signs a JWT for the given user id (24h expiry).
 */
function signToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '24h' });
}

/**
 * Verifies a JWT and returns the decoded payload.
 * Throws if invalid or expired.
 */
function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

/**
 * Registers a new user.
 * @param {string} name
 * @param {string} email
 * @param {string} password  plain-text password (min 8 chars enforced by Zod upstream)
 * @returns {{ user, token }}
 */
async function register(name, email, password) {
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    const err = new Error('An account with that email already exists.');
    err.status = 409;
    throw err;
  }

  // Store plain password in passwordHash field — pre-save hook will hash it
  const user = await User.create({ name, email, passwordHash: password });
  const token = signToken(user._id);
  return { user, token };
}

/**
 * Authenticates an existing user.
 * @param {string} email
 * @param {string} password  plain-text password
 * @returns {{ user, token }}
 */
async function login(email, password) {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
  if (!user) {
    const err = new Error('Invalid email or password.');
    err.status = 401;
    throw err;
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    const err = new Error('Invalid email or password.');
    err.status = 401;
    throw err;
  }

  const token = signToken(user._id);
  return { user, token };
}

module.exports = { register, login, signToken, verifyToken };
