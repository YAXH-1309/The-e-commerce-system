const { register, login } = require('../services/authService');
const { sendSuccess } = require('../utils/response');

async function registerUser(req, res, next) {
  try {
    const { name, email, password } = req.body;
    const { user, token } = await register(name, email, password);
    sendSuccess(res, { user, token }, 'Account created successfully.', 201);
  } catch (err) {
    next(err);
  }
}

async function loginUser(req, res, next) {
  try {
    const { email, password } = req.body;
    const { user, token } = await login(email, password);
    sendSuccess(res, { user, token }, 'Login successful.');
  } catch (err) {
    next(err);
  }
}

module.exports = { registerUser, loginUser };
