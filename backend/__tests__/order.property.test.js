const request = require('supertest');
const fc = require('fast-check');
const app = require('../app');
const User = require('../models/User');
const Product = require('../models/Product');
const Cart = require('../models/Cart');
const { connectTestDB, disconnectTestDB, clearTestDB } = require('./helpers/testHelpers');

beforeAll(async () => {
  await connectTestDB();
});

afterAll(async () => {
  await disconnectTestDB();
});

afterEach(async () => {
  await clearTestDB();
});

const { signToken } = require('../services/authService');

/** Create a user and return { userId, token } */
async function createUser(suffix = '') {
  const user = await User.create({
    name: 'OrderUser',
    email: `orderuser${suffix}_${Date.now()}@test.com`,
    passwordHash: 'placeholder',
    role: 'user',
  });
  return { userId: user._id.toString(), token: signToken(user._id) };
}

/** Create a product with given stock and price, return { productId, price, stock } */
async function createProduct(stock = 10, price = 20) {
  const p = await Product.create({
    name: 'Order Product',
    description: 'desc',
    price,
    category: 'electronics',
    stock,
    images: ['https://example.com/img.jpg'],
  });
  return { productId: p._id.toString(), price, stock };
}

const validAddress = {
  street: '123 Main St',
  city: 'Lagos',
  country: 'NG',
  postalCode: '100001',
};

// ── Property 12: Order creation correctness ───────────────────────────────────
// Feature: ecommerce-system, Property 12: Order creation correctness
// For any non-empty cart and valid shipping address, placing an order should produce
// an order record with status "pending", the correct total price, and all cart items
// captured as snapshots.
// Validates: Requirements 5.1
describe('Property 12: Order creation correctness', () => {
  test(
    'placed order has status pending, correct total price, and item snapshots',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 5 }),
          fc.float({ min: 5, max: 200, noNaN: true }),
          async (quantity, price) => {
            await clearTestDB();
            const { userId, token } = await createUser();
            const { productId } = await createProduct(quantity + 5, price);

            // Add item to cart
            for (let i = 0; i < quantity; i++) {
              await request(app)
                .post('/api/v1/cart')
                .set('Authorization', `Bearer ${token}`)
                .send({ productId });
            }

            // Place order
            const orderRes = await request(app)
              .post('/api/v1/orders')
              .set('Authorization', `Bearer ${token}`)
              .send({ shippingAddress: validAddress });

            expect(orderRes.status).toBe(201);
            const order = orderRes.body.data.order;
            expect(order.status).toBe('pending');
            expect(order.totalPrice).toBeCloseTo(price * quantity, 1);
            expect(Array.isArray(order.items)).toBe(true);
            expect(order.items.length).toBeGreaterThan(0);
            // Items are snapshots — they have name and price fields
            expect(typeof order.items[0].name).toBe('string');
            expect(typeof order.items[0].price).toBe('number');
          }
        ),
        { numRuns: 20 }
      );
    },
    120000
  );
});

// ── Property 13: Stock decrement on order ─────────────────────────────────────
// Feature: ecommerce-system, Property 13: Stock decrement on order
// For any order, after the order is created, each ordered product's stock should be
// reduced by exactly the ordered quantity.
// Validates: Requirements 5.2
describe('Property 13: Stock decrement on order', () => {
  test(
    'product stock decrements by exactly the ordered quantity after order placement',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 5 }),
          fc.integer({ min: 6, max: 20 }),
          async (quantity, initialStock) => {
            await clearTestDB();
            const { token } = await createUser();
            const { productId } = await createProduct(initialStock, 15);

            // Add item `quantity` times
            for (let i = 0; i < quantity; i++) {
              await request(app)
                .post('/api/v1/cart')
                .set('Authorization', `Bearer ${token}`)
                .send({ productId });
            }

            // Place order
            await request(app)
              .post('/api/v1/orders')
              .set('Authorization', `Bearer ${token}`)
              .send({ shippingAddress: validAddress });

            // Check stock
            const productRes = await request(app).get(`/api/v1/products/${productId}`);
            expect(productRes.status).toBe(200);
            expect(productRes.body.data.product.stock).toBe(initialStock - quantity);
          }
        ),
        { numRuns: 20 }
      );
    },
    120000
  );
});

// ── Property 14: Order history sort order ─────────────────────────────────────
// Feature: ecommerce-system, Property 14: Order history sort order
// For any user with multiple orders, the order history endpoint should return orders
// sorted by creation date descending (newest first).
// Validates: Requirements 5.3
describe('Property 14: Order history sort order', () => {
  test(
    'order history is sorted newest first',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 2, max: 3 }),
          async (orderCount) => {
            await clearTestDB();
            const { userId, token } = await createUser();

            // Place multiple orders sequentially, each with a fresh product
            for (let i = 0; i < orderCount; i++) {
              const { productId } = await createProduct(10, 10);

              // Add to cart
              await request(app)
                .post('/api/v1/cart')
                .set('Authorization', `Bearer ${token}`)
                .send({ productId });

              // Place order
              const orderRes = await request(app)
                .post('/api/v1/orders')
                .set('Authorization', `Bearer ${token}`)
                .send({ shippingAddress: validAddress });

              expect(orderRes.status).toBe(201);
            }

            const historyRes = await request(app)
              .get('/api/v1/orders/me')
              .set('Authorization', `Bearer ${token}`);

            expect(historyRes.status).toBe(200);
            const orders = historyRes.body.data.orders;
            expect(orders.length).toBe(orderCount);

            // Verify descending order by createdAt
            for (let i = 1; i < orders.length; i++) {
              const prev = new Date(orders[i - 1].createdAt).getTime();
              const curr = new Date(orders[i].createdAt).getTime();
              expect(prev).toBeGreaterThanOrEqual(curr);
            }
          }
        ),
        { numRuns: 5 }
      );
    },
    120000
  );
});

// ── Property 15: Oversell rejection ───────────────────────────────────────────
// Feature: ecommerce-system, Property 15: Oversell rejection
// For any product with a known stock quantity, attempting to order a quantity greater
// than the stock should be rejected with a non-2xx status.
// Validates: Requirements 5.5
describe('Property 15: Oversell rejection', () => {
  test(
    'ordering more than available stock is rejected',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 5 }),
          async (stock) => {
            await clearTestDB();
            const { token } = await createUser();
            const { productId } = await createProduct(stock, 10);

            // Add stock+1 items to cart by manipulating cart directly
            // (addItem rejects out-of-stock, so we seed the cart directly)
            const Cart = require('../models/Cart');
            const User = require('../models/User');
            const user = await User.findOne({ role: 'user' });
            await Cart.findOneAndUpdate(
              { user: user._id },
              {
                user: user._id,
                items: [{ product: productId, quantity: stock + 1 }],
              },
              { upsert: true, new: true }
            );

            const orderRes = await request(app)
              .post('/api/v1/orders')
              .set('Authorization', `Bearer ${token}`)
              .send({ shippingAddress: validAddress });

            expect(orderRes.status).toBeGreaterThanOrEqual(400);
            expect(orderRes.status).toBeLessThan(600);
            expect(orderRes.body.success).toBe(false);
          }
        ),
        { numRuns: 20 }
      );
    },
    90000
  );
});
