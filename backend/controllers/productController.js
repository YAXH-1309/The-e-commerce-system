const {
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
  softDeleteProduct,
} = require('../services/productService');
const Review = require('../models/Review');
const { sendSuccess } = require('../utils/response');

async function getProducts(req, res, next) {
  try {
    const { page = 1, limit = 20, category, search, sort } = req.query;
    const result = await listProducts({
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      category,
      search,
      sort,
    });
    const message = result.total === 0
      ? 'No products match the applied filters.'
      : 'Products retrieved successfully.';
    sendSuccess(res, result, message);
  } catch (err) {
    next(err);
  }
}

async function getProduct(req, res, next) {
  try {
    const product = await getProductById(req.params.id);
    const reviews = await Review.find({ product: product._id })
      .populate('user', 'name')
      .sort({ createdAt: -1 });
    sendSuccess(res, { product, reviews }, 'Product retrieved successfully.');
  } catch (err) {
    next(err);
  }
}

async function createProductHandler(req, res, next) {
  try {
    const product = await createProduct(req.body);
    sendSuccess(res, { product }, 'Product created successfully.', 201);
  } catch (err) {
    next(err);
  }
}

async function updateProductHandler(req, res, next) {
  try {
    const product = await updateProduct(req.params.id, req.body);
    sendSuccess(res, { product }, 'Product updated successfully.');
  } catch (err) {
    next(err);
  }
}

async function deleteProductHandler(req, res, next) {
  try {
    await softDeleteProduct(req.params.id);
    sendSuccess(res, null, 'Product deleted successfully.');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getProducts,
  getProduct,
  createProductHandler,
  updateProductHandler,
  deleteProductHandler,
};
