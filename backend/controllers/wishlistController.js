const { getWishlist, addToWishlist, removeFromWishlist } = require('../services/wishlistService');
const { sendSuccess } = require('../utils/response');

async function getWishlistHandler(req, res, next) {
  try {
    const wishlist = await getWishlist(req.user._id.toString());
    sendSuccess(res, { wishlist }, 'Wishlist retrieved successfully.');
  } catch (err) {
    next(err);
  }
}

async function addToWishlistHandler(req, res, next) {
  try {
    const { productId } = req.body;
    if (!productId) {
      const err = new Error('productId is required.');
      err.status = 400;
      return next(err);
    }
    const wishlist = await addToWishlist(req.user._id.toString(), productId);
    sendSuccess(res, { wishlist }, 'Product added to wishlist.');
  } catch (err) {
    next(err);
  }
}

async function removeFromWishlistHandler(req, res, next) {
  try {
    const { productId } = req.params;
    const wishlist = await removeFromWishlist(req.user._id.toString(), productId);
    sendSuccess(res, { wishlist }, 'Product removed from wishlist.');
  } catch (err) {
    next(err);
  }
}

module.exports = { getWishlistHandler, addToWishlistHandler, removeFromWishlistHandler };
