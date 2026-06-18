// routes/webhooks.js
const express = require('express');
const Stripe = require('stripe');
const pool = require('../db/pool');

const router = express.Router();
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// POST /api/webhooks/stripe
// This is called BY STRIPE, not by your website's visitors. It's how we
// reliably know a payment actually succeeded - never trust the browser
// redirect alone, since a customer could close the tab or the network
// could drop before the redirect happens. Stripe retries this until your
// server responds 200, so it's the source of truth.
//
// NOTE: this route needs the raw (unparsed) request body to verify the
// signature, which is why server.js registers it before express.json().
router.post('/stripe', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    try {
      await pool.query(
        `UPDATE orders SET status = 'paid', stripe_payment_intent_id = $1 WHERE stripe_session_id = $2`,
        [session.payment_intent, session.id]
      );
    } catch (err) {
      console.error('Failed to mark order as paid:', err);
      // Still return 200 below - Stripe will retry on non-2xx, but a DB
      // error here needs to be looked at directly, not solved by retries alone.
    }
  }

  res.json({ received: true });
});

module.exports = router;
