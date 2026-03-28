const fc = require('fast-check');
const mongoose = require('mongoose');
const User = require('../models/User');
const Product = require('../models/Product');
const Cart = require('../models/Cart');
const Order = require('../models/Order');
const Review = require('../models/Review');
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

// ── Property 25: Domain object serialization round trip ───────────────────────
// Feature: ecommerce-system, Property 25: Domain object serialization round trip
// For any domain object (User, Product, Order, Cart, Review), serializing it to the
// database and then deserializing the stored document should produce an object with
// equivalent field values to the original.
// Validates: Requirements 9.1, 9.2

const alphaChars = 'abcdefghijklmnopqrstuvwxyz';
const alphaArb = fc.constantFrom(...alphaChars);

const alphaStr = (min = 3, max = 20) =>
  fc.stringOf(alphaArb, { minLength: min, maxLength: max });

describe('Property 25: Domain object serialization round trip', () => {
  test(
    'User fields survive a save → find round trip',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            name: alphaStr(1, 20),
            email: fc.emailAddress(),
            role: fc.constantFrom('user', 'admin'),
          }),
          async ({ name, email, role }) => {
            await clearTestDB();

            const created = await User.create({
              name,
              email,
              passwordHash: 'hashed_placeholder',
              role,
            });

            const found = await User.findById(created._id).lean();

            expect(found.name).toBe(name);
            expect(found.email).toBe(email.toLowerCase());
            expect(found.role).toBe(role);
            expect(found.createdAt).toBeDefined();
            // passwordHash must be present in raw DB doc
            expect(found.passwordHash).toBeDefined();
          }
        ),
        { numRuns: 50 }
      );
    },
    120000
  );

  test(
    'Product fields survive a save → find round trip',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            name: alphaStr(3, 20),
            description: alphaStr(5, 50),
            price: fc.float({ min: 0, max: 10000, noNaN: true }),
            category: fc.constantFrom('electronics', 'clothing', 'books', 'home'),
            stock: fc.integer({ min: 0, max: 500 }),
          }),
          async ({ name, description, price, category, stock }) => {
            await clearTestDB();

            const created = await Product.create({
              name,
              description,
              price,
              category,
              stock,
              images: ['https://example.com/img.jpg'],
            });

            const found = await Product.findById(created._id).lean();

            expect(found.name).toBe(name);
            expect(found.description).toBe(description);
            expect(found.price).toBeCloseTo(price, 5);
            expect(found.category).toBe(category);
            expect(found.stock).toBe(stock);
            expect(found.images).toEqual(['https://example.com/img.jpg']);
            expect(found.averageRating).toBe(0);
            expect(found.isDeleted).toBe(false);
          }
        ),
        { numRuns: 50 }
      );
    },
    120000
  );

  test(
    'Order fields survive a save → find round trip',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            itemName: alphaStr(3, 15),
            price: fc.float({ min: 1, max: 500, noNaN: true }),
            quantity: fc.integer({ min: 1, max: 10 }),
            street: alphaStr(3, 20),
            city: alphaStr(3, 15),
            country: alphaStr(2, 10),
            postalCode: fc.stringOf(fc.constantFrom(...'0123456789'), { minLength: 4, maxLength: 8 }),
          }),
          async ({ itemName, price, quantity, street, city, country, postalCode }) => {
            await clearTestDB();

            const user = await User.create({
              name: 'OrderUser',
              email: `order_${Date.now()}@test.com`,
              passwordHash: 'placeholder',
            });

            const totalPrice = price * quantity;

            const created = await Order.create({
              user: user._id,
              items: [{ product: new mongoose.Types.ObjectId(), name: itemName, price, quantity }],
              totalPrice,
              shippingAddress: { street, city, country, postalCode },
              status: 'pending',
            });

            const found = await Order.findById(created._id).lean();

            expect(found.items[0].name).toBe(itemName);
            expect(found.items[0].price).toBeCloseTo(price, 5);
            expect(found.items[0].quantity).toBe(quantity);
            expect(found.totalPrice).toBeCloseTo(totalPrice, 5);
            expect(found.shippingAddress.street).toBe(street);
            expect(found.shippingAddress.city).toBe(city);
            expect(found.status).toBe('pending');
          }
        ),
        { numRuns: 50 }
      );
    },
    120000
  );

  test(
    'Review fields survive a save → find round trip',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            rating: fc.integer({ min: 1, max: 5 }),
            comment: alphaStr(3, 50),
          }),
          async ({ rating, comment }) => {
            await clearTestDB();

            const user = await User.create({
              name: 'ReviewUser',
              email: `rev_${Date.now()}@test.com`,
              passwordHash: 'placeholder',
            });

            const product = await Product.create({
              name: 'ReviewProduct',
              description: 'desc',
              price: 10,
              category: 'books',
              stock: 5,
              images: ['https://example.com/img.jpg'],
            });

            const created = await Review.create({
              product: product._id,
              user: user._id,
              rating,
              comment,
            });

            const found = await Review.findById(created._id).lean();

            expect(found.rating).toBe(rating);
            expect(found.comment).toBe(comment);
            expect(found.product.toString()).toBe(product._id.toString());
            expect(found.user.toString()).toBe(user._id.toString());
          }
        ),
        { numRuns: 50 }
      );
    },
    120000
  );
});
