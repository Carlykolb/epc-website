// server.js
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');

const pool = require('./db/pool');
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const checkoutRoutes = require('./routes/checkout');
const orderRoutes = require('./routes/orders');
const webhookRoutes = require('./routes/webhooks');
const adminRoutes = require('./routes/admin');

const app = express();

// The Stripe webhook route MUST be registered before express.json() below,
// because it needs the raw request body to verify Stripe's signature.
app.use('/api/webhooks', express.raw({ type: 'application/json' }), webhookRoutes);

app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);

// Serve the existing website files (your index.html, images, etc.) from /public
app.use(express.static(path.join(__dirname, 'public')));

// Creates the database tables if they don't already exist yet. This uses
// "CREATE TABLE IF NOT EXISTS" so it's safe to run every time the app
// starts - no manual database setup step required.
async function initDatabase() {
  const schema = fs.readFileSync(path.join(__dirname, 'db', 'schema.sql'), 'utf8');
  await pool.query(schema);
  console.log('Database schema is ready.');
}

const PORT = process.env.PORT || 3000;

initDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`EPC backend running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to set up the database on startup:', err);
    process.exit(1);
  });
