const User = require('../models/User');
const Product = require('../models/Product');

/**
 * Retrieve the wishlist for a user, populating current product name and price.
 * @param {string} userId
 * @returns {Product[]}
 */
async function getWishlist(userId) {
  const user = await User.findById(userId).populate('wishlist', 'name price images');
  if (!user) {
    const err = new Error('User not found.');
    err.status = 404;
    throw err;
  }
  return user.wishlist;
}

/**
 * Add a product to the wishlist. Idempotent — no-op if already present.
 * @param {string} userId
 * @param {string} productId
 * @returns {Product[]}
 */
async function addToWishlist(userId, productId) {
  const product = await Product.findById(productId);
  if (!product) {
    const err = new Error('Product not found.');
    err.status = 404;
    throw err;
  }

  const user = await User.findById(userId);
  if (!user) {
    const err = new Error('User not found.');
    err.status = 404;
    throw err;
  }

  const alreadyPresent = user.wishlist.some((id) => id.toString() === productId);
  if (!alreadyPresent) {
    user.wishlist.push(productId);
    await user.save();
  }

  await user.populate('wishlist', 'name price images');
  return user.wishlist;
}

/**
 * Remove a product from the wishlist.
 * @param {string} userId
 * @param {string} productId
 * @returns {Product[]}
 */
async function removeFromWishlist(userId, productId) {
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error('User not found.');
    err.status = 404;
    throw err;
  }

  user.wishlist = user.wishlist.filter((id) => id.toString() !== productId);
  await user.save();

  await user.populate('wishlist', 'name price images');
  return user.wishlist;
}

module.exports = { getWishlist, addToWishlist, removeFromWishlist };
