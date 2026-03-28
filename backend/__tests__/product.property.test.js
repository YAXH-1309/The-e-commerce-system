const request = require('supertest');
const fc = require('fast-check');
const app = require('../app');
const Product = require('../models/Product');
const User = require('../models/User');
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

// ── Shared arbitraries ────────────────────────────────────────────────────────

const categories = ['electronics', 'clothing', 'books', 'home', 'sports'];

const alphaChars = 'abcdefghijklmnopqrstuvwxyz';
const alphaArb = fc.constantFrom(...alphaChars);

const validProductData = (category) =>
  fc.record({
    name: fc.stringOf(alphaArb, { minLength: 3, maxLength: 20 }),
    description: fc.stringOf(alphaArb, { minLength: 5, maxLength: 50 }),
    price: fc.float({ min: 1, max: 1000, noNaN: true }),
    category: category ? fc.constant(category) : fc.constantFrom(...categories),
    stock: fc.integer({ min: 1, max: 100 }),
    images: fc.constant(['https://example.com/img.jpg']),
  });

/** Create an admin user and return a Bearer token */
async function createAdminToken() {
  const admin = await User.create({
    name: 'Admin',
    email: `admin_${Date.now()}@test.com`,
    passwordHash: 'placeholder',
    role: 'admin',
  });
  const { signToken } = require('../services/authService');
  return signToken(admin._id);
}

/** Create a regular user and return a Bearer token */
async function createUserToken() {
  const user = await User.create({
    name: 'User',
    email: `user_${Date.now()}@test.com`,
    passwordHash: 'placeholder',
    role: 'user',
  });
  const { signToken } = require('../services/authService');
  return signToken(user._id);
}

// ── Property 5: Category filter correctness ───────────────────────────────────
// Feature: ecommerce-system, Property 5: Category filter correctness
// For any set of products with mixed categories and any chosen category, filtering
// the product listing by that category should return only products whose category
// matches the filter.
// Validates: Requirements 2.2
describe('Property 5: Category filter correctness', () => {
  test(
    'all returned products match the requested category',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...categories),
          fc.array(validProductData(), { minLength: 3, maxLength: 8 }),
          async (targetCategory, productDataList) => {
            await clearTestDB();

            // Seed products
            await Product.insertMany(productDataList);

            const res = await request(app)
              .get(`/api/v1/products?category=${targetCategory}&limit=100`);

            expect(res.status).toBe(200);
            const products = res.body.data.products;
            for (const p of products) {
              expect(p.category).toBe(targetCategory);
            }
          }
        ),
        { numRuns: 30 }
      );
    },
    90000
  );
});

// ── Property 6: Search query correctness ─────────────────────────────────────
// Feature: ecommerce-system, Property 6: Search query correctness
// For any product set and any non-empty search query, all products returned by the
// search should have the query string present (case-insensitive) in their name or description.
// Validates: Requirements 2.3
describe('Property 6: Search query correctness', () => {
  test(
    'all returned products contain the search term in name or description',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.stringOf(alphaArb, { minLength: 2, maxLength: 5 }),
          async (searchTerm) => {
            await clearTestDB();

            // Seed a product that definitely matches
            await Product.create({
              name: `Product ${searchTerm} item`,
              description: 'Generic description',
              price: 10,
              category: 'books',
              stock: 5,
              images: ['https://example.com/img.jpg'],
            });

            // Seed a product that definitely does NOT match
            await Product.create({
              name: 'Completely unrelated zzz',
              description: 'Nothing here zzz',
              price: 20,
              category: 'books',
              stock: 5,
              images: ['https://example.com/img.jpg'],
            });

            const res = await request(app)
              .get(`/api/v1/products?search=${encodeURIComponent(searchTerm)}&limit=100`);

            expect(res.status).toBe(200);
            const products = res.body.data.products;
            const lower = searchTerm.toLowerCase();
            for (const p of products) {
              const inName = p.name.toLowerCase().includes(lower);
              const inDesc = p.description.toLowerCase().includes(lower);
              expect(inName || inDesc).toBe(true);
            }
          }
        ),
        { numRuns: 30 }
      );
    },
    90000
  );
});

// ── Property 7: Sort order correctness ───────────────────────────────────────
// Feature: ecommerce-system, Property 7: Sort order correctness
// For any product set sorted by price ascending, the returned list should be in
// non-decreasing price order.
// Validates: Requirements 2.4
describe('Property 7: Sort order correctness', () => {
  test(
    'price_asc sort returns products in non-decreasing price order',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(validProductData(), { minLength: 2, maxLength: 8 }),
          async (productDataList) => {
            await clearTestDB();
            await Product.insertMany(productDataList);

            const res = await request(app)
              .get('/api/v1/products?sort=price_asc&limit=100');

            expect(res.status).toBe(200);
            const prices = res.body.data.products.map((p) => p.price);
            for (let i = 1; i < prices.length; i++) {
              expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1]);
            }
          }
        ),
        { numRuns: 30 }
      );
    },
    90000
  );
});

// ── Property 8: Product detail response completeness ─────────────────────────
// Feature: ecommerce-system, Property 8: Product detail response completeness
// For any persisted product, the detail endpoint response should contain name,
// description, price, category, stock, and at least one image URL.
// Validates: Requirements 3.1
describe('Property 8: Product detail response completeness', () => {
  test(
    'product detail response contains all required fields',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          validProductData(),
          async (productData) => {
            await clearTestDB();
            const created = await Product.create(productData);

            const res = await request(app)
              .get(`/api/v1/products/${created._id}`);

            expect(res.status).toBe(200);
            const p = res.body.data.product;
            expect(typeof p.name).toBe('string');
            expect(typeof p.description).toBe('string');
            expect(typeof p.price).toBe('number');
            expect(typeof p.category).toBe('string');
            expect(typeof p.stock).toBe('number');
            expect(Array.isArray(p.images)).toBe(true);
            expect(p.images.length).toBeGreaterThanOrEqual(1);
          }
        ),
        { numRuns: 30 }
      );
    },
    90000
  );
});

// ── Property 16: Admin product creation ──────────────────────────────────────
// Feature: ecommerce-system, Property 16: Admin product creation
// For any valid product payload submitted by an admin, the created product returned
// by the API should contain all submitted fields.
// Validates: Requirements 6.1
describe('Property 16: Admin product creation', () => {
  test(
    'admin-created product contains all submitted fields',
    async () => {
      const adminToken = await createAdminToken();

      await fc.assert(
        fc.asyncProperty(
          validProductData(),
          async (productData) => {
            await Product.deleteMany({});

            const res = await request(app)
              .post('/api/v1/products')
              .set('Authorization', `Bearer ${adminToken}`)
              .send(productData);

            expect(res.status).toBe(201);
            const p = res.body.data.product;
            expect(p.name).toBe(productData.name);
            expect(p.description).toBe(productData.description);
            expect(p.price).toBeCloseTo(productData.price, 2);
            expect(p.category).toBe(productData.category);
            expect(p.stock).toBe(productData.stock);
          }
        ),
        { numRuns: 20 }
      );
    },
    90000
  );
});

// ── Property 17: Admin product update ────────────────────────────────────────
// Feature: ecommerce-system, Property 17: Admin product update
// For any existing product and any valid partial update payload submitted by an admin,
// the updated product returned by the API should reflect all changed fields.
// Validates: Requirements 6.2
describe('Property 17: Admin product update', () => {
  test(
    'admin-updated product reflects changed fields',
    async () => {
      const adminToken = await createAdminToken();

      await fc.assert(
        fc.asyncProperty(
          validProductData(),
          fc.record({
            price: fc.float({ min: 1, max: 500, noNaN: true }),
            stock: fc.integer({ min: 0, max: 50 }),
          }),
          async (originalData, updates) => {
            await Product.deleteMany({});
            const created = await Product.create(originalData);

            const res = await request(app)
              .put(`/api/v1/products/${created._id}`)
              .set('Authorization', `Bearer ${adminToken}`)
              .send(updates);

            expect(res.status).toBe(200);
            const p = res.body.data.product;
            expect(p.price).toBeCloseTo(updates.price, 2);
            expect(p.stock).toBe(updates.stock);
          }
        ),
        { numRuns: 20 }
      );
    },
    90000
  );
});

// ── Property 18: Admin product deletion ──────────────────────────────────────
// Feature: ecommerce-system, Property 18: Admin product deletion
// For any existing product deleted by an admin, a subsequent GET request for that
// product should return a 404 status.
// Validates: Requirements 6.3
describe('Property 18: Admin product deletion', () => {
  test(
    'deleted product returns 404 on subsequent GET',
    async () => {
      const adminToken = await createAdminToken();

      await fc.assert(
        fc.asyncProperty(
          validProductData(),
          async (productData) => {
            await Product.deleteMany({});
            const created = await Product.create(productData);

            const delRes = await request(app)
              .delete(`/api/v1/products/${created._id}`)
              .set('Authorization', `Bearer ${adminToken}`);

            expect(delRes.status).toBe(200);

            const getRes = await request(app)
              .get(`/api/v1/products/${created._id}`);

            expect(getRes.status).toBe(404);
          }
        ),
        { numRuns: 20 }
      );
    },
    90000
  );
});

// ── Property 19: Non-admin write rejection ────────────────────────────────────
// Feature: ecommerce-system, Property 19: Non-admin write rejection
// For any non-admin user, any attempt to create, update, or delete a product
// should return a 403 status.
// Validates: Requirements 6.4
describe('Property 19: Non-admin write rejection', () => {
  test(
    'non-admin user receives 403 on product write operations',
    async () => {
      const userToken = await createUserToken();

      await fc.assert(
        fc.asyncProperty(
          validProductData(),
          async (productData) => {
            await Product.deleteMany({});
            const existing = await Product.create(productData);

            const createRes = await request(app)
              .post('/api/v1/products')
              .set('Authorization', `Bearer ${userToken}`)
              .send(productData);
            expect(createRes.status).toBe(403);

            const updateRes = await request(app)
              .put(`/api/v1/products/${existing._id}`)
              .set('Authorization', `Bearer ${userToken}`)
              .send({ price: 1 });
            expect(updateRes.status).toBe(403);

            const deleteRes = await request(app)
              .delete(`/api/v1/products/${existing._id}`)
              .set('Authorization', `Bearer ${userToken}`);
            expect(deleteRes.status).toBe(403);
          }
        ),
        { numRuns: 20 }
      );
    },
    90000
  );
});
