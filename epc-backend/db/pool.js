// db/pool.js
// Single shared Postgres connection pool, used by every route file.
const { Pool } = require('pg');

// DigitalOcean Managed Databases require SSL. The `rejectUnauthorized: false`
// setting is the common, simple approach used for DO's managed Postgres
// (it still encrypts the connection, it just skips strict CA cert checking).
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle Postgres client', err);
});

module.exports = pool;
