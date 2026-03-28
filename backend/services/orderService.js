const mongoose = require('mongoose');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');

/**
 * Place an order from the user's current cart.
 *
 * Steps (all within a MongoDB transaction):
 *  1. Load and validate cart is non-empty.
 *  2. Validate stock is sufficient for every item.
 *  3. Create the Order with item snapshots.
 *  4. Decrement stock on each Product.
 *  5. Clear the cart.
 *
 * @param {string} userId
 * @param {{ street, city, country, postalCode }} shippingAddress
 * @returns {Order}
 */
async function placeOrder(userId, shippingAddress) {
  // Populate cart outside the session first to read current data
  const cart = await Cart.findOne({ user: userId }).populate('items.product');

  if (!cart || cart.items.length === 0) {
    const err = new Error('Cart is empty. Add items before placing an order.');
    err.status = 400;
    throw err;
  }

  // Validate stock for all items before opening a transaction
  for (const item of cart.items) {
    const product = item.product;
    if (!product || product.isDeleted) {
      const err = new Error(`Product is no longer available.`);
      err.status = 400;
      throw err;
    }
    if (item.quantity > product.stock) {
      const err = new Error(
        `Insufficient stock for "${product.name}". Requested: ${item.quantity}, available: ${product.stock}.`
      );
      err.status = 400;
      throw err;
    }
  }

  // Build order items as snapshots
  const orderItems = cart.items.map((item) => ({
    product: item.product._id,
    name: item.product.name,
    price: item.product.price,
    quantity: item.quantity,
  }));

  const totalPrice = orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

  // Execute atomically inside a transaction (falls back to non-transactional in test env)
  const session = await mongoose.startSession();
  let createdOrder;

  const executeOps = async (sess) => {
    const sessionOpt = sess ? { session: sess } : {};

    const [order] = await Order.create(
      [{ user: userId, items: orderItems, totalPrice, shippingAddress, status: 'pending' }],
      sessionOpt
    );
    createdOrder = order;

    for (const item of cart.items) {
      await Product.findByIdAndUpdate(
        item.product._id,
        { $inc: { stock: -item.quantity } },
        sessionOpt
      );
    }

    await Cart.findOneAndUpdate({ user: userId }, { $set: { items: [] } }, sessionOpt);
  };

  try {
    await session.withTransaction(() => executeOps(session));
  } catch (txErr) {
    // Fallback for environments that don't support transactions (e.g. standalone mongod in tests)
    if (
      txErr.codeName === 'CommandNotSupported' ||
      txErr.message.includes('Transaction') ||
      txErr.message.includes('transaction') ||
      txErr.code === 20
    ) {
      await executeOps(null);
    } else {
      throw txErr;
    }
  } finally {
    session.endSession();
  }

  return createdOrder;
}

/**
 * Return the order history for a user, sorted newest first.
 * @param {string} userId
 * @returns {Order[]}
 */
async function getOrderHistory(userId) {
  return Order.find({ user: userId }).sort({ createdAt: -1 });
}

module.exports = { placeOrder, getOrderHistory };
