const mongoose = require('mongoose');
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

describe('User model serialization', () => {
  test('passwordHash is stripped from toJSON output', async () => {
    const user = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      passwordHash: 'plaintextpassword123',
      role: 'user',
    });

    const json = user.toJSON();
    expect(json.passwordHash).toBeUndefined();
  });

  test('required fields survive a save → find round trip', async () => {
    const userData = {
      name: 'Round Trip User',
      email: 'roundtrip@example.com',
      passwordHash: 'plaintextpassword123',
      role: 'user',
    };

    const created = await User.create(userData);
    const found = await User.findById(created._id).lean();

    expect(found.name).toBe(userData.name);
    expect(found.email).toBe(userData.email);
    expect(found.role).toBe(userData.role);
    // passwordHash should be present in the raw DB document (lean)
    expect(found.passwordHash).toBeDefined();
    expect(found.createdAt).toBeDefined();
  });

  test('passwordHash is stripped from API response (toJSON) after find', async () => {
    const created = await User.create({
      name: 'API User',
      email: 'api@example.com',
      passwordHash: 'plaintextpassword123',
    });

    const found = await User.findById(created._id);
    const json = found.toJSON();

    expect(json.passwordHash).toBeUndefined();
    expect(json.name).toBe('API User');
    expect(json.email).toBe('api@example.com');
  });

  test('wishlist field defaults to empty array', async () => {
    const user = await User.create({
      name: 'Wishlist User',
      email: 'wishlist@example.com',
      passwordHash: 'plaintextpassword123',
    });

    const found = await User.findById(user._id);
    expect(Array.isArray(found.wishlist)).toBe(true);
    expect(found.wishlist).toHaveLength(0);
  });
});

describe('Product model serialization', () => {
  const validProduct = {
    name: 'Test Product',
    description: 'A test product description',
    price: 29.99,
    category: 'electronics',
    stock: 10,
    images: ['https://example.com/image.jpg'],
  };

  test('required fields survive a save → find round trip', async () => {
    const created = await Product.create(validProduct);
    const found = await Product.findById(created._id).lean();

    expect(found.name).toBe(validProduct.name);
    expect(found.description).toBe(validProduct.description);
    expect(found.price).toBe(validProduct.price);
    expect(found.category).toBe(validProduct.category);
    expect(found.stock).toBe(validProduct.stock);
    expect(found.images).toEqual(validProduct.images);
    expect(found.createdAt).toBeDefined();
  });

  test('averageRating defaults to 0', async () => {
    const created = await Product.create(validProduct);
    const found = await Product.findById(created._id).lean();
    expect(found.averageRating).toBe(0);
  });

  test('isDeleted defaults to false and soft-deleted products are excluded from queries', async () => {
    const product = await Product.create(validProduct);

    // Soft delete
    await Product.findByIdAndUpdate(product._id, { isDeleted: true });

    // Default query should exclude it
    const found = await Product.findById(product._id);
    expect(found).toBeNull();

    // Explicit override should find it
    const foundDeleted = await Product.findOne({ _id: product._id, isDeleted: true });
    expect(foundDeleted).not.toBeNull();
  });

  test('price and stock enforce minimum of 0', async () => {
    await expect(
      Product.create({ ...validProduct, price: -1 })
    ).rejects.toThrow();

    await expect(
      Product.create({ ...validProduct, stock: -1 })
    ).rejects.toThrow();
  });

  test('images array requires at least one entry', async () => {
    await expect(
      Product.create({ ...validProduct, images: [] })
    ).rejects.toThrow();
  });
});
