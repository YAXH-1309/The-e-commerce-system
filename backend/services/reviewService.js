const Review = require('../models/Review');
const Product = require('../models/Product');

/**
 * Recalculate and persist the averageRating on a Product.
 * @param {string} productId
 */
async function recalculateAverageRating(productId) {
  const result = await Review.aggregate([
    { $match: { product: productId } },
    { $group: { _id: '$product', avg: { $avg: '$rating' } } },
  ]);

  const avg = result.length > 0 ? result[0].avg : 0;

  await Product.findByIdAndUpdate(productId, { averageRating: avg });
  return avg;
}

/**
 * Add a review for a product by an authenticated user.
 * Validates rating range, rejects duplicates, persists, and updates averageRating.
 * @param {string} productId
 * @param {string} userId
 * @param {{ rating: number, comment: string }} data
 * @returns {Review}
 */
async function addReview(productId, userId, { rating, comment }) {
  // Validate rating range (belt-and-suspenders; Zod schema also validates)
  if (rating < 1 || rating > 5) {
    const err = new Error('Rating must be between 1 and 5.');
    err.status = 400;
    throw err;
  }

  // Ensure product exists
  const product = await Product.findById(productId);
  if (!product) {
    const err = new Error('Product not found.');
    err.status = 404;
    throw err;
  }

  // Attempt to create; unique index will throw on duplicate
  let review;
  try {
    review = await Review.create({ product: productId, user: userId, rating, comment });
  } catch (err) {
    if (err.code === 11000) {
      const dupErr = new Error('You have already reviewed this product.');
      dupErr.status = 409;
      throw dupErr;
    }
    throw err;
  }

  await recalculateAverageRating(product._id);

  await review.populate('user', 'name');
  return review;
}

module.exports = { addReview, recalculateAverageRating };
