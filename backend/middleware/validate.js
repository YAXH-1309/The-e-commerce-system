const { z } = require('zod');

// ── Auth schemas ──────────────────────────────────────────────────────────────

const registerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

/**
 * Returns an Express middleware that validates req.body against the given Zod schema.
 * On failure it passes a 400 error to next().
 */
function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const message = result.error.errors.map((e) => e.message).join('; ');
      const err = new Error(message);
      err.status = 400;
      return next(err);
    }
    req.body = result.data; // use coerced/trimmed values
    next();
  };
}

// ── Product schemas ───────────────────────────────────────────────────────────

const createProductSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().min(1, 'Description is required'),
  price: z.number({ invalid_type_error: 'Price must be a number' }).min(0, 'Price must be >= 0'),
  category: z.string().min(1, 'Category is required'),
  stock: z.number({ invalid_type_error: 'Stock must be a number' }).int().min(0, 'Stock must be >= 0'),
  images: z
    .array(z.string().url('Each image must be a valid URL'))
    .min(1, 'At least one image URL is required'),
});

const updateProductSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  price: z.number().min(0).optional(),
  category: z.string().min(1).optional(),
  stock: z.number().int().min(0).optional(),
  images: z.array(z.string().url()).min(1).optional(),
});

// ── Review schema ─────────────────────────────────────────────────────────────

const reviewSchema = z.object({
  rating: z
    .number({ invalid_type_error: 'Rating must be a number' })
    .int('Rating must be an integer')
    .min(1, 'Rating must be at least 1')
    .max(5, 'Rating must be at most 5'),
  comment: z.string().min(1, 'Comment is required'),
});

module.exports = {
  registerSchema,
  loginSchema,
  createProductSchema,
  updateProductSchema,
  reviewSchema,
  validate,
};
