// routes/products.js
const express = require('express');
const pool = require('../db/pool');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

// GET /api/products - list products. Requires login, since the catalog is gated.
// Supports ?search=, ?brand=, ?page=, ?limit= (defaults to 50 per page since
// there are 2,600+ items - never return them all in one response).
router.get('/', requireAuth, async (req, res) => {
  const { search, brand } = req.query;
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
  const offset = (page - 1) * limit;

  const conditions = [];
  const values = [];

  if (search) {
    values.push(`%${search}%`);
    conditions.push(`(model ILIKE $${values.length} OR description ILIKE $${values.length} OR sku ILIKE $${values.length})`);
  }
  if (brand) {
    values.push(brand);
    conditions.push(`brand = $${values.length}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM products ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0].count, 10);

    values.push(limit, offset);
    const productsResult = await pool.query(
      `SELECT id, sku, brand, model, description, price, stock_quantity, image_url
       FROM products ${whereClause}
       ORDER BY brand, model
       LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values
    );

    res.json({
      products: productsResult.rows,
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('Product list error:', err);
    res.status(500).json({ error: 'Could not load products.' });
  }
});

// GET /api/products/brands - distinct brand list, handy for a filter dropdown
router.get('/brands', requireAuth, async (req, res) => {
  const result = await pool.query('SELECT DISTINCT brand FROM products ORDER BY brand');
  res.json({ brands: result.rows.map((r) => r.brand) });
});

// GET /api/products/:id - single product detail
router.get('/:id', requireAuth, async (req, res) => {
  const result = await pool.query(
    'SELECT id, sku, brand, model, description, price, stock_quantity, image_url FROM products WHERE id = $1',
    [req.params.id]
  );
  if (!result.rows[0]) {
    return res.status(404).json({ error: 'Product not found.' });
  }
  res.json({ product: result.rows[0] });
});

module.exports = router;
