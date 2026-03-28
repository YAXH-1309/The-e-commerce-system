const Cart = require('../models/Cart');
const Product = require('../models/Product');

/**
 * Retrieve (or create) the cart for a user, populating product details.
 * @param {string} userId
 * @returns {Cart}
 */
async function getCart(userId) {
  let cart = await Cart.findOne({ user: userId }).populate('items.product', 'name price stock');
  if (!cart) {
    cart = await Cart.create({ user: userId, items: [] });
  }
  return cart;
}

/**
 * Add a product to the cart (upsert with quantity increment).
 * Rejects if the product's stock is 0.
 * @param {string} userId
 * @param {string} productId
 * @returns {Cart}
 */
async function addItem(userId, productId) {
  const product = await Product.findById(productId);
  if (!product) {
    const err = new Error('Product not found.');
    err.status = 404;
    throw err;
  }
  if (product.stock === 0) {
    const err = new Error('Product is out of stock.');
    err.status = 400;
    throw err;
  }

  let cart = await Cart.findOne({ user: userId });
  if (!cart) {
    cart = new Cart({ user: userId, items: [] });
  }

  const existing = cart.items.find((i) => i.product.toString() === productId);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.items.push({ product: productId, quantity: 1 });
  }

  await cart.save();
  return cart.populate('items.product', 'name price stock');
}

/**
 * Update the quantity of a cart item.
 * @param {string} userId
 * @param {string} productId
 * @param {number} quantity  Must be >= 1
 * @returns {Cart}
 */
async function updateItem(userId, productId, quantity) {
  if (!Number.isInteger(quantity) || quantity < 1) {
    const err = new Error('Quantity must be a positive integer.');
    err.status = 400;
    throw err;
  }

  const cart = await Cart.findOne({ user: userId });
  if (!cart) {
    const err = new Error('Cart not found.');
    err.status = 404;
    throw err;
  }

  const item = cart.items.find((i) => i.product.toString() === productId);
  if (!item) {
    const err = new Error('Item not found in cart.');
    err.status = 404;
    throw err;
  }

  item.quantity = quantity;
  await cart.save();
  return cart.populate('items.product', 'name price stock');
}

/**
 * Remove a product from the cart.
 * @param {string} userId
 * @param {string} productId
 * @returns {Cart}
 */
async function removeItem(userId, productId) {
  const cart = await Cart.findOne({ user: userId });
  if (!cart) {
    const err = new Error('Cart not found.');
    err.status = 404;
    throw err;
  }

  const initialLength = cart.items.length;
  cart.items = cart.items.filter((i) => i.product.toString() !== productId);

  if (cart.items.length === initialLength) {
    const err = new Error('Item not found in cart.');
    err.status = 404;
    throw err;
  }

  await cart.save();
  return cart.populate('items.product', 'name price stock');
}

module.exports = { getCart, addItem, updateItem, removeItem };
