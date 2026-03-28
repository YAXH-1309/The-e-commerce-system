const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const cartRoutes = require('./routes/cartRoutes');
const orderRoutes = require('./routes/orderRoutes');
const wishlistRoutes = require('./routes/wishlistRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const errorMiddleware = require('./middleware/errorMiddleware');

const app = express();

// ── Logging ──────────────────────────────────────────────────────────────────
app.use(morgan('dev'));

// ── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json());

// ── Rate limiting (auth endpoints only — disabled in test environment) ───────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: { success: false, message: 'Too many requests, please try again later.', status: 429 },
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/cart', cartRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/wishlist', wishlistRoutes);

// Review routes are nested under products: /api/v1/products/:id/reviews
// Mounted via productRoutes in task 10; stub router registered here for completeness
app.use('/api/v1/reviews', reviewRoutes);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/v1/health', (req, res) => {
  res.json({ success: true, data: null, message: 'OK' });
});

// ── Central error handler (must be last) ─────────────────────────────────────
app.use(errorMiddleware);

module.exports = app;
