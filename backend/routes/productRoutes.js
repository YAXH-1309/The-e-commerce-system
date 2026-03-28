const { Router } = require('express');
const {
  getProducts,
  getProduct,
  createProductHandler,
  updateProductHandler,
  deleteProductHandler,
} = require('../controllers/productController');
const { createReview } = require('../controllers/reviewController');
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');
const { validate, createProductSchema, updateProductSchema, reviewSchema } = require('../middleware/validate');

const router = Router();

// Public routes
router.get('/', getProducts);
router.get('/:id', getProduct);

// Review route (auth-protected, nested under product)
router.post('/:id/reviews', authMiddleware, validate(reviewSchema), createReview);

// Admin-only routes
router.post('/', authMiddleware, adminMiddleware, validate(createProductSchema), createProductHandler);
router.put('/:id', authMiddleware, adminMiddleware, validate(updateProductSchema), updateProductHandler);
router.delete('/:id', authMiddleware, adminMiddleware, deleteProductHandler);

module.exports = router;
