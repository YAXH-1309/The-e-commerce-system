const { Router } = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const { getCartHandler, addItemHandler, updateItemHandler, removeItemHandler } = require('../controllers/cartController');

const router = Router();

// All cart routes require authentication
router.use(authMiddleware);

router.get('/', getCartHandler);
router.post('/', addItemHandler);
router.put('/:productId', updateItemHandler);
router.delete('/:productId', removeItemHandler);

module.exports = router;
