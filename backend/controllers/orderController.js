const { placeOrder, getOrderHistory } = require('../services/orderService');
const { sendSuccess } = require('../utils/response');

async function placeOrderHandler(req, res, next) {
  try {
    const { shippingAddress } = req.body;
    if (
      !shippingAddress ||
      !shippingAddress.street ||
      !shippingAddress.city ||
      !shippingAddress.country ||
      !shippingAddress.postalCode
    ) {
      const err = new Error(
        'shippingAddress with street, city, country, and postalCode is required.'
      );
      err.status = 400;
      return next(err);
    }

    const order = await placeOrder(req.user._id.toString(), shippingAddress);
    sendSuccess(res, { order }, 'Order placed successfully.', 201);
  } catch (err) {
    next(err);
  }
}

async function getOrderHistoryHandler(req, res, next) {
  try {
    const orders = await getOrderHistory(req.user._id.toString());
    sendSuccess(res, { orders }, 'Order history retrieved successfully.');
  } catch (err) {
    next(err);
  }
}

module.exports = { placeOrderHandler, getOrderHistoryHandler };
