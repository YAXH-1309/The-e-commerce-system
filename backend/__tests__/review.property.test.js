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

async function createUser(suffix = '') {
  const user = await User.create({
    name: 'Reviewer',
    email: `reviewer${suffix}_${Date.now()}@test.com`,
    passwordHash: 'placeholder',
    role: 'user',
  });
  return { userId: user._id.toString(), token: signToken(user._id) };
}

async function createProduct() {
  const p = await Product.create({
    name: 'Reviewed Product',
    description: 'desc',
    price: 50,
    category: 'electronics',
    stock: 10,
    images: ['https://example.com/img.jpg'],
  });
  return p._id.toString();
}

// ── Property 22: Review persistence and average rating ────────────────────────
// Feature: ecommerce-system, Property 22: Review persistence and average rating
// For any product and any set of valid reviews (ratings 1–5), after all reviews are
// submitted the product's averageRating should equal the arithmetic mean of all
// submitted ratings.
// Validates: Requirements 8.1, 8.2
describe('Property 22: Review persistence and average rating', () => {
  test(
    'product averageRating equals arithmetic mean of all submitted ratings',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.integer({ min: 1, max: 5 }), { minLength: 1, maxLength: 5 }),
          async (ratings) => {
            await clearTestDB();
            const productId = await createProduct();

            // Create one user per review (each user can only review once)
            for (let i = 0; i < ratings.length; i++) {
              const { token } = await createUser(`_r${i}`);
              const res = await request(app)
                .post(`/api/v1/products/${productId}/reviews`)
                .set('Authorization', `Bearer ${token}`)
                .send({ rating: ratings[i], comment: 'Great product' });
              expect(res.status).toBe(201);
            }

            // Fetch the product and check averageRating
            const productRes = await request(app).get(`/api/v1/products/${productId}`);
            expect(productRes.status).toBe(200);

            const expectedAvg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
            const actualAvg = productRes.body.data.product.averageRating;
            expect(actualAvg).toBeCloseTo(expectedAvg, 5);
          }
        ),
        { numRuns: 20 }
      );
    },
    120000
  );
});

// ── Property 23: Duplicate review rejection ───────────────────────────────────
// Feature: ecommerce-system, Property 23: Duplicate review rejection
// For any user who has already reviewed a product, a second review submission for
// the same product should be rejected with a non-2xx status.
// Validates: Requirements 8.3
describe('Property 23: Duplicate review rejection', () => {
  test(
    'submitting a second review for the same product is rejected',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 5 }),
          fc.integer({ min: 1, max: 5 }),
          async (rating1, rating2) => {
            await clearTestDB();
            const productId = await createProduct();
            const { token } = await createUser();

            // First review — must succeed
            const firstRes = await request(app)
              .post(`/api/v1/products/${productId}/reviews`)
              .set('Authorization', `Bearer ${token}`)
              .send({ rating: rating1, comment: 'First review' });
            expect(firstRes.status).toBe(201);

            // Second review — must be rejected
            const secondRes = await request(app)
              .post(`/api/v1/products/${productId}/reviews`)
              .set('Authorization', `Bearer ${token}`)
              .send({ rating: rating2, comment: 'Second review' });
            expect(secondRes.status).toBeGreaterThanOrEqual(400);
            expect(secondRes.body.success).toBe(false);
          }
        ),
        { numRuns: 20 }
      );
    },
    90000
  );
});

// ── Property 24: Out-of-range rating rejection ────────────────────────────────
// Feature: ecommerce-system, Property 24: Out-of-range rating rejection
// For any rating value outside the inclusive range [1, 5], submitting a review with
// that rating should be rejected with a non-2xx status.
// Validates: Requirements 8.4
describe('Property 24: Out-of-range rating rejection', () => {
  test(
    'ratings outside [1, 5] are rejected',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.integer({ min: -100, max: 0 }),
            fc.integer({ min: 6, max: 100 })
          ),
          async (invalidRating) => {
            await clearTestDB();
            const productId = await createProduct();
            const { token } = await createUser();

            const res = await request(app)
              .post(`/api/v1/products/${productId}/reviews`)
              .set('Authorization', `Bearer ${token}`)
              .send({ rating: invalidRating, comment: 'Bad rating' });

            expect(res.status).toBeGreaterThanOrEqual(400);
            expect(res.body.success).toBe(false);
          }
        ),
        { numRuns: 30 }
      );
    },
    90000
  );
});
