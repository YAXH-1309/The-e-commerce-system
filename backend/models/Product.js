const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    category: { type: String, required: true, trim: true },
    stock: { type: Number, required: true, min: 0, default: 0 },
    images: {
      type: [String],
      required: true,
      validate: {
        validator: (arr) => arr.length >= 1,
        message: 'At least one image URL is required.',
      },
    },
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false } }
);

// Indexes for filtering, sorting, and pagination
productSchema.index({ category: 1 });
productSchema.index({ price: 1 });
productSchema.index({ createdAt: -1 });

// Default query helper: exclude soft-deleted products
productSchema.pre(/^find/, function (next) {
  // Only apply the filter if not explicitly overridden
  if (this.getFilter().isDeleted === undefined) {
    this.where({ isDeleted: false });
  }
  next();
});

module.exports = mongoose.model('Product', productSchema);
