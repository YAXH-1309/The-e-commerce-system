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

const { signToken } = require('../services/authService');

async function createUser() {
  const user = await User.create({
    name: 'WishUser',
    email: `wish_${Date.now()}@test.com`,
    passwordHash: 'placeholder',
    role: 'user',
  });
  return { userId: user._id.toString(), token: signToken(user._id) };
}

async function createProduct() {
  const p = await Product.create({
    name: 'Wish Product',
    description: 'desc',
    price: 30,
    category: 'home',
    stock: 5,
    images: ['https://example.com/img.jpg'],
  });
  return p._id.toString();
}

// ── Property 20: Wishlist add idempotence ─────────────────────────────────────
// Feature: ecommerce-system, Property 20: Wishlist add idempotence
// For any authenticated user and any product, adding the product to the wishlist
// twice should produce the same wishlist as adding it once (no duplicates).
// Validates: Requirements 7.1, 7.3, 7.4
describe('Property 20: Wishlist add idempotence', () => {
  test(
    'adding the same product multiple times results in no duplicates',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 2, max: 5 }),
          async (addCount) => {
            await clearTestDB();
            const { token } = await createUser();
            const productId = await createProduct();

            // Add the same product multiple times
            for (let i = 0; i < addCount; i++) {
              const res = await request(app)
                .post('/api/v1/wishlist')
                .set('Authorization', `Bearer ${token}`)
                .send({ productId });
              expect(res.status).toBe(200);
            }

            // Retrieve wishlist
            const getRes = await request(app)
              .get('/api/v1/wishlist')
              .set('Authorization', `Bearer ${token}`);

            expect(getRes.status).toBe(200);
            const wishlist = getRes.body.data.wishlist;

            // Count occurrences of the product
            const occurrences = wishlist.filter(
              (p) => (p._id || p).toString() === productId
            ).length;
            expect(occurrences).toBe(1);
          }
        ),
        { numRuns: 20 }
      );
    },
    90000
  );
});

// ── Property 21: Wishlist removal ─────────────────────────────────────────────
// Feature: ecommerce-system, Property 21: Wishlist removal
// For any wishlist containing a product, removing that product should result in the
// product no longer appearing in the wishlist.
// Validates: Requirements 7.2
describe('Property 21: Wishlist removal', () => {
  test(
    'removing a product from the wishlist means it no longer appears',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 3 }),
          async (extraCount) => {
            await clearTestDB();
            const { token } = await createUser();

            // Add multiple products
            const productIds = [];
            for (let i = 0; i < extraCount + 1; i++) {
              const pid = await createProduct();
              productIds.push(pid);
              await request(app)
                .post('/api/v1/wishlist')
                .set('Authorization', `Bearer ${token}`)
                .send({ productId: pid });
            }

            const targetId = productIds[0];

            // Remove the first product
            const delRes = await request(app)
              .delete(`/api/v1/wishlist/${targetId}`)
              .set('Authorization', `Bearer ${token}`);

            expect(delRes.status).toBe(200);

            // Verify it's gone
            const getRes = await request(app)
              .get('/api/v1/wishlist')
              .set('Authorization', `Bearer ${token}`);

            expect(getRes.status).toBe(200);
            const wishlist = getRes.body.data.wishlist;
            const found = wishlist.find(
              (p) => (p._id || p).toString() === targetId
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
