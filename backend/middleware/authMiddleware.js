const { verifyToken } = require('../services/authService');
const User = require('../models/User');

/**
 * Validates the Bearer JWT in the Authorization header.
 * On success, attaches the full user document to req.user.
 */
async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const err = new Error('No token provided. Please log in.');
      err.status = 401;
      return next(err);
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    const user = await User.findById(decoded.id);
    if (!user) {
      const err = new Error('User not found.');
      err.status = 401;
      return next(err);
    }

    req.user = user;
    next();
  } catch (error) {
    const err = new Error('Invalid or expired token.');
    err.status = 401;
    next(err);
  }
}

/**
 * Requires req.user.role === 'admin'.
 * Must be used after authMiddleware.
 */
function adminMiddleware(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    const err = new Error('Access denied. Admins only.');
    err.status = 403;
    return next(err);
  }
  next();
}

module.exports = { authMiddleware, adminMiddleware };
