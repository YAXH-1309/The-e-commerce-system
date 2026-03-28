const request = require('supertest');
const fc = require('fast-check');
const app = require('../app');
const User = require('../models/User');
const Product = require('../models/Product');
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

/** Create a user and return { userId, token } */
async function createUser(suffix = '') {
  const { signToken } = require('../services/authService');
  const user = await User.create({
    name: 'CartUser',
    email: `cartuser${suffix}_${Date.now()}@test.com`,
    passwordHash: 'placeholder',
    role: 'user',
  });
  return { userId: user._id.toString(), token: signToken(user._id) };
}

/** Create an in-stock product and return its id */
async function createProduct(stock = 10) {
  const p = await Product.create({
    name: 'Cart Product',
    description: 'desc',
    price: 25.0,
    category: 'electronics',
    stock,
    images: ['https://example.com/img.jpg'],
  });
  return p._id.toString();
}

// ── Property 9: Cart add and retrieve ────────────────────────────────────────
// Feature: ecommerce-system, Property 9: Cart add and retrieve
// For any authenticated user and any in-stock product, adding the product to the
// cart and then retrieving the cart should return a cart item with the correct
// product id, name, price, and quantity >= 1. Adding the same product a second
// time should increment the quantity by 1.
// Validates: Requirements 4.1, 4.5
describe('Property 9: Cart add and retrieve', () => {
  test(
    'adding a product to the cart and retrieving returns correct item; second add increments quantity',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 5 }),
          async (addCount) => {
            await clearTestDB();
            const { token } = await createUser();
            const productId = await createProduct(20);

            // Add the product `addCount` times
            for (let i = 0; i < addCount; i++) {
              const addRes = await request(app)
                .post('/api/v1/cart')
                .set('Authorization', `Bearer ${token}`)
                .send({ productId });
              expect(addRes.status).toBe(200);
            }

            // Retrieve the cart
            const getRes = await request(app)
              .get('/api/v1/cart')
              .set('Authorization', `Bearer ${token}`);

            expect(getRes.status).toBe(200);
            const items = getRes.body.data.cart.items;
            const item = items.find(
              (i) => (i.product._id || i.product).toString() === productId
            );
            expect(item).toBeDefined();
            expect(item.quantity).toBe(addCount);
            expect(item.quantity).toBeGreaterThanOrEqual(1);
          }
        ),
        { numRuns: 20 }
      );
    },
    90000
  );
});

// ── Property 10: Cart quantity update ────────────────────────────────────────
// Feature: ecommerce-system, Property 10: Cart quantity update
// For any cart item and any positive integer quantity, updating the item quantity
// should result in the cart returning that exact quantity for the item.
// Validates: Requirements 4.2
describe('Property 10: Cart quantity update', () => {
  test(
    'updating cart item quantity stores the exact specified value',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 20 }),
          async (newQuantity) => {
            await clearTestDB();
            const { token } = await createUser();
            const productId = await createProduct(50);

            // Add item first
            await request(app)
              .post('/api/v1/cart')
              .set('Authorization', `Bearer ${token}`)
              .send({ productId });

            // Update quantity
            const updateRes = await request(app)
              .put(`/api/v1/cart/${productId}`)
              .set('Authorization', `Bearer ${token}`)
              .send({ quantity: newQuantity });

            expect(updateRes.status).toBe(200);

            // Retrieve and verify
            const getRes = await request(app)
              .get('/api/v1/cart')
              .set('Authorization', `Bearer ${token}`);

            const items = getRes.body.data.cart.items;
            const item = items.find(
              (i) => (i.product._id || i.product).toString() === productId
            );
            expect(item).toBeDefined();
            expect(item.quantity).toBe(newQuantity);
          }
        ),
        { numRuns: 20 }
      );
    },
    90000
  );
});

// ── Property 11: Cart item removal ───────────────────────────────────────────
// Feature: ecommerce-system, Property 11: Cart item removal
// For any cart containing a product, removing that product should result in the
// product no longer appearing in the cart.
// Validates: Requirements 4.3
describe('Property 11: Cart item removal', () => {
  test(
    'removing a product from the cart means it no longer appears in the cart',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 3 }),
          async (extraProducts) => {
            await clearTestDB();
            const { token } = await createUser();

            // Create multiple products and add them all
            const productIds = [];
            for (let i = 0; i < extraProducts + 1; i++) {
              const pid = await createProduct(10);
              productIds.push(pid);
              await request(app)
                .post('/api/v1/cart')
                .set('Authorization', `Bearer ${token}`)
                .send({ productId: pid });
            }

            const targetId = productIds[0];

            // Remove the first product
            const delRes = await request(app)
              .delete(`/api/v1/cart/${targetId}`)
              .set('Authorization', `Bearer ${token}`);

            expect(delRes.status).toBe(200);

            // Verify it's gone
            const getRes = await request(app)
              .get('/api/v1/cart')
              .set('Authorization', `Bearer ${token}`);

            const items = getRes.body.data.cart.items;
            const found = items.find(
              (i) => (i.product._id || i.product).toString() === targetId
            );
            expect(found).toBeUndefined();
          }
        ),
        { numRuns: 20 }
      );
    },
    90000
  );
});
