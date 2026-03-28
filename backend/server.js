require('dotenv').config();
const mongoose = require('mongoose');
const { validateEnv } = require('./config/env');
const app = require('./app');

// Fail fast if required env vars are missing
validateEnv();

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
  });
