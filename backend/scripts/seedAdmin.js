/**
 * Creates a default admin user if none exists.
 * Reads credentials from environment variables:
 *   ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD
 *
 * Usage: node backend/scripts/seedAdmin.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function seedAdmin() {
  const { MONGO_URI, ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;

  if (!MONGO_URI || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error('Required env vars: MONGO_URI, ADMIN_EMAIL, ADMIN_PASSWORD');
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI);

  const existing = await User.findOne({ email: ADMIN_EMAIL.toLowerCase() });
  if (existing) {
    console.log(`Admin user already exists: ${ADMIN_EMAIL}`);
  } else {
    await User.create({
      name: ADMIN_NAME || 'Admin',
      email: ADMIN_EMAIL,
      passwordHash: ADMIN_PASSWORD,
      role: 'admin',
    });
    console.log(`Admin user created: ${ADMIN_EMAIL}`);
  }

  await mongoose.disconnect();
}

seedAdmin().catch((err) => {
  console.error(err);
  process.exit(1);
});
