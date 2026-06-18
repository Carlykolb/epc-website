// routes/orders.js
const express = require('express');
const pool = require('../db/pool');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

// GET /api/orders - the logged-in customer's own order history only.
// Always filter by req.customer.id - never let a customer pass in someone
// else's id to see their orders.
router.get('/', requireAuth, async (req, res) => {
  const result = await pool.query(
    `SELECT id, status, total_amount, created_at FROM orders
     WHERE customer_id = $1 ORDER BY created_at DESC`,
    [req.customer.id]
  );
  res.json({ orders: result.rows });
});

// GET /api/orders/:id - one order's line items, only if it belongs to this customer
router.get('/:id', requireAuth, async (req, res) => {
  const orderResult = await pool.query(
    'SELECT id, status, total_amount, created_at FROM orders WHERE id = $1 AND customer_id = $2',
    [req.params.id, req.customer.id]
  );
  const order = orderResult.rows[0];
  if (!order) {
    return res.status(404).json({ error: 'Order not found.' });
  }

  const itemsResult = await pool.query(
    `SELECT oi.quantity, oi.unit_price, p.sku, p.brand, p.model
     FROM order_items oi JOIN products p ON p.id = oi.product_id
     WHERE oi.order_id = $1`,
    [order.id]
  );

  res.json({ order: { ...order, items: itemsResult.rows } });
});

module.exports = router;
