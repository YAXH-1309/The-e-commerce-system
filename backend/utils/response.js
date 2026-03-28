/**
 * Sends a standardised JSON response: { success, data, message }
 */
function sendSuccess(res, data, message = 'OK', statusCode = 200) {
  return res.status(statusCode).json({ success: true, data, message });
}

function sendError(res, message, statusCode = 500) {
  return res.status(statusCode).json({ success: false, data: null, message });
}

module.exports = { sendSuccess, sendError };
