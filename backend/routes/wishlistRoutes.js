const { Router } = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const { getWishlistHandler, addToWishlistHandler, removeFromWishlistHandler } = require('../controllers/wishlistController');

const router = Router();

// All wishlist routes require authentication
router.use(authMiddleware);

router.get('/', getWishlistHandler);
router.post('/', addToWishlistHandler);
router.delete('/:productId', removeFromWishlistHandler);

module.exports = router;
