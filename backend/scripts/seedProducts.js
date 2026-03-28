/**
 * Inserts a set of sample products across multiple categories.
 * Skips insertion if products already exist.
 *
 * Usage: node backend/scripts/seedProducts.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

const SAMPLE_PRODUCTS = [
  {
    name: 'Wireless Noise-Cancelling Headphones',
    description: 'Over-ear headphones with active noise cancellation and 30h battery life.',
    price: 149.99,
    category: 'electronics',
    stock: 50,
    images: ['https://placehold.co/400x400?text=Headphones'],
  },
  {
    name: 'Mechanical Keyboard',
    description: 'Compact TKL mechanical keyboard with Cherry MX switches.',
    price: 89.99,
    category: 'electronics',
    stock: 30,
    images: ['https://placehold.co/400x400?text=Keyboard'],
  },
  {
    name: 'Running Shoes',
    description: 'Lightweight running shoes with responsive cushioning.',
    price: 79.99,
    category: 'footwear',
    stock: 100,
    images: ['https://placehold.co/400x400?text=Shoes'],
  },
  {
    name: 'Yoga Mat',
    description: 'Non-slip 6mm thick yoga mat with carrying strap.',
    price: 29.99,
    category: 'sports',
    stock: 75,
    images: ['https://placehold.co/400x400?text=YogaMat'],
  },
  {
    name: 'Stainless Steel Water Bottle',
    description: 'Insulated 750ml bottle keeps drinks cold for 24h.',
    price: 24.99,
    category: 'kitchen',
    stock: 200,
    images: ['https://placehold.co/400x400?text=Bottle'],
  },
  {
    name: 'JavaScript: The Good Parts',
    description: 'Classic book on JavaScript best practices by Douglas Crockford.',
    price: 19.99,
    category: 'books',
    stock: 40,
    images: ['https://placehold.co/400x400?text=Book'],
  },
];

async function seedProducts() {
  const { MONGO_URI } = process.env;
  if (!MONGO_URI) {
    console.error('Required env var: MONGO_URI');
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI);

  const count = await Product.countDocuments();
  if (count > 0) {
    console.log(`Products already seeded (${count} found). Skipping.`);
  } else {
    await Product.insertMany(SAMPLE_PRODUCTS);
    console.log(`Inserted ${SAMPLE_PRODUCTS.length} sample products.`);
  }

  await mongoose.disconnect();
}

seedProducts().catch((err) => {
  console.error(err);
  process.exit(1);
});
