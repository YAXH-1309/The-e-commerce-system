const { Router } = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const { placeOrderHandler, getOrderHistoryHandler } = require('../controllers/orderController');

const router = Router();

// All order routes require authentication
router.use(authMiddleware);

// POST /api/v1/orders — place an order from the current cart
router.post('/', placeOrderHandler);

// GET /api/v1/orders/me — retrieve the authenticated user's order history
router.get('/me', getOrderHistoryHandler);

module.exports = router;
