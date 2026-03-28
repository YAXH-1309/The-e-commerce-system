const { addReview } = require('../services/reviewService');
const { sendSuccess } = require('../utils/response');

async function createReview(req, res, next) {
  try {
    const review = await addReview(req.params.id, req.user._id.toString(), req.body);
    sendSuccess(res, { review }, 'Review submitted successfully.', 201);
  } catch (err) {
    next(err);
  }
}

module.exports = { createReview };
