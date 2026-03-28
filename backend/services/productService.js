const Product = require('../models/Product');

const SORT_MAP = {
  price_asc: { price: 1 },
  price_desc: { price: -1 },
  newest: { createdAt: -1 },
};

/**
 * List products with pagination, filtering, search, and sorting.
 * @param {object} options
 * @param {number} options.page
 * @param {number} options.limit
 * @param {string} [options.category]
 * @param {string} [options.search]
 * @param {string} [options.sort]  'price_asc' | 'price_desc' | 'newest'
 * @returns {{ products, total, page, pages }}
 */
async function listProducts({ page = 1, limit = 20, category, search, sort } = {}) {
  const query = {};

  if (category) {
    query.category = category;
  }

  if (search) {
    const regex = new RegExp(search, 'i');
    query.$or = [{ name: regex }, { description: regex }];
  }

  const sortOrder = SORT_MAP[sort] || { createdAt: -1 };
  const skip = (page - 1) * limit;

  const [products, total] = await Promise.all([
    Product.find(query).sort(sortOrder).skip(skip).limit(limit),
    Product.countDocuments(query),
  ]);

  return {
    products,
    total,
    page,
    pages: Math.ceil(total / limit),
  };
}

/**
 * Get a single product by ID (excludes soft-deleted).
 * @param {string} id
 * @returns {Product}
 */
async function getProductById(id) {
  const product = await Product.findById(id);
  if (!product) {
    const err = new Error('Product not found.');
    err.status = 404;
    throw err;
  }
  return product;
}

/**
 * Create a new product.
 * @param {object} data
 * @returns {Product}
 */
async function createProduct(data) {
  return Product.create(data);
}

/**
 * Update an existing product by ID.
 * @param {string} id
 * @param {object} updates
 * @returns {Product}
 */
async function updateProduct(id, updates) {
  const product = await Product.findByIdAndUpdate(id, updates, {
    new: true,
    runValidators: true,
  });
  if (!product) {
    const err = new Error('Product not found.');
    err.status = 404;
    throw err;
  }
  return product;
}

/**
 * Soft-delete a product by setting isDeleted = true.
 * @param {string} id
 */
async function softDeleteProduct(id) {
  // Bypass the default isDeleted filter to find the document
  const product = await Product.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { isDeleted: true },
    { new: true }
  );
  if (!product) {
    const err = new Error('Product not found.');
    err.status = 404;
    throw err;
  }
  return product;
}

module.exports = { listProducts, getProductById, createProduct, updateProduct, softDeleteProduct };
