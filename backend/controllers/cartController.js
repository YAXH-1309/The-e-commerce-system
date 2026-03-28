const { getCart, addItem, updateItem, removeItem } = require('../services/cartService');
const { sendSuccess } = require('../utils/response');

async function getCartHandler(req, res, next) {
  try {
    const cart = await getCart(req.user._id.toString());
    sendSuccess(res, { cart }, 'Cart retrieved successfully.');
  } catch (err) {
    next(err);
  }
}

async function addItemHandler(req, res, next) {
  try {
    const { productId } = req.body;
    if (!productId) {
      const err = new Error('productId is required.');
      err.status = 400;
      return next(err);
    }
    const cart = await addItem(req.user._id.toString(), productId);
    sendSuccess(res, { cart }, 'Item added to cart.');
  } catch (err) {
    next(err);
  }
}

async function updateItemHandler(req, res, next) {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;
    if (quantity === undefined) {
      const err = new Error('quantity is required.');
      err.status = 400;
      return next(err);
    }
    const cart = await updateItem(req.user._id.toString(), productId, quantity);
    sendSuccess(res, { cart }, 'Cart item updated.');
  } catch (err) {
    next(err);
  }
}

async function removeItemHandler(req, res, next) {
  try {
    const { productId } = req.params;
    const cart = await removeItem(req.user._id.toString(), productId);
    sendSuccess(res, { cart }, 'Item removed from cart.');
  } catch (err) {
    next(err);
  }
}

module.exports = { getCartHandler, addItemHandler, updateItemHandler, removeItemHandler };
