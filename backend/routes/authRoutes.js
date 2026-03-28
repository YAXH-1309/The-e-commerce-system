const { Router } = require('express');
const { registerUser, loginUser } = require('../controllers/authController');
const { validate, registerSchema, loginSchema } = require('../middleware/validate');

const router = Router();

// POST /api/v1/auth/register
router.post('/register', validate(registerSchema), registerUser);

// POST /api/v1/auth/login
router.post('/login', validate(loginSchema), loginUser);

module.exports = router;
