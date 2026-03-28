/**
 * Validates required environment variables at startup.
 * Throws immediately if any required variable is missing (fail fast).
 */
const REQUIRED_VARS = ['MONGO_URI', 'JWT_SECRET'];

function validateEnv() {
  const missing = REQUIRED_VARS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. ` +
        'Copy .env.example to .env and fill in the values.'
    );
  }
}

module.exports = { validateEnv };
