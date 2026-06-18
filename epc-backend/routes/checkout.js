// routes/checkout.js
const express = require('express');
const Stripe = require('stripe');
const pool = require('../db/pool');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// POST /api/checkout/create-session
// Body: { items: [{ product_id, quantity }, ...] }
//
// IMPORTANT: prices always come from the database here, never from the
// client. A customer's browser could be tampered with, so we look up the
// authoritative price for every product_id ourselves before charging anyone.
router.post('/create-session', requireAuth, async (req, res) => {
  const { items } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Your cart is empty.' });
  }

  try {
    const productIds = items.map((i) => i.product_id);
    const productsResult = await pool.query(
      'SELECT id, sku, brand, model, price FROM products WHERE id = ANY($1)',
      [productIds]
    );
    const productsById = new Map(productsResult.rows.map((p) => [p.id, p]));

    const lineItems = [];
    const orderItemsForDb = [];
    let totalAmount = 0;

    for (const item of items) {
      const product = productsById.get(item.product_id);
      const quantity = parseInt(item.quantity, 10);

      if (!product || !quantity || quantity < 1) {
        return res.status(400).json({ error: 'One or more items in your cart are invalid.' });
      }

      const unitPrice = Number(product.price);
      totalAmount += unitPrice * quantity;

      lineItems.push({
        quantity,
        price_data: {
          currency: 'usd',
          unit_amount: Math.round(unitPrice * 100), // Stripe uses cents
          product_data: {
            name: `${product.brand} ${product.model}`,
            metadata: { sku: product.sku },
          },
        },
      });

      orderItemsForDb.push({ product_id: product.id, quantity, unit_price: unitPrice });
    }

    // Create a "pending" order first so we have something to update once
    // Stripe confirms the payment via webhook.
    const orderResult = await pool.query(
      `INSERT INTO orders (customer_id, status, total_amount) VALUES ($1, 'pending', $2) RETURNING id`,
      [req.customer.id, totalAmount]
    );
    const orderId = orderResult.rows[0].id;

    for (const item of orderItemsForDb) {
      await pool.query(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES ($1, $2, $3, $4)`,
        [orderId, item.product_id, item.quantity, item.unit_price]
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: lineItems,
      customer_email: req.customer.email,
      success_url: `${process.env.APP_URL}/order-success.html?order_id=${orderId}`,
      cancel_url: `${process.env.APP_URL}/cart.html`,
      metadata: { order_id: String(orderId), customer_id: String(req.customer.id) },
    });

    // Save the Stripe session id on the order so the webhook can find it later
    await pool.query('UPDATE orders SET stripe_session_id = $1 WHERE id = $2', [session.id, orderId]);

    res.json({ url: session.url });
  } catch (err) {
    console.error('Checkout error:', err);
    res.status(500).json({ error: 'Something went wrong starting checkout.' });
  }
});

module.exports = router;
