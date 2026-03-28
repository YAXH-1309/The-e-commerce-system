/**
 * Central error handler.
 * Returns: { success: false, message, status }
 */
// eslint-disable-next-line no-unused-vars
function errorMiddleware(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(status).json({ success: false, message, status });
}

module.exports = errorMiddleware;
