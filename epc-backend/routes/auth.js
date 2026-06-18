// routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

const COOKIE_OPTIONS = {
  httpOnly: true, // JavaScript on the page can't read this cookie - protects against XSS token theft
  secure: process.env.NODE_ENV === 'production', // only sent over HTTPS in production
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

function signToken(customer) {
  return jwt.sign(
    { id: customer.id, email: customer.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  const { email, password, company_name, contact_name, phone } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO customers (email, password_hash, company_name, contact_name, phone)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, company_name, contact_name`,
      [email.toLowerCase().trim(), passwordHash, company_name || null, contact_name || null, phone || null]
    );

    const customer = result.rows[0];
    const token = signToken(customer);
    res.cookie('token', token, COOKIE_OPTIONS);
    res.status(201).json({ customer });
  } catch (err) {
    if (err.code === '23505') {
      // Postgres unique_violation - this email is already registered
      return res.status(409).json({ error: 'An account with that email already exists.' });
    }
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Something went wrong creating your account.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const result = await pool.query(
      'SELECT id, email, password_hash, company_name, contact_name FROM customers WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    const customer = result.rows[0];
    // Deliberately vague error message - don't reveal whether the email
    // exists or the password was wrong, that helps attackers enumerate accounts.
    if (!customer) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const matches = await bcrypt.compare(password, customer.password_hash);
    if (!matches) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = signToken(customer);
    res.cookie('token', token, COOKIE_OPTIONS);
    res.json({
      customer: {
        id: customer.id,
        email: customer.email,
        company_name: customer.company_name,
        contact_name: customer.contact_name,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Something went wrong logging you in.' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('token', COOKIE_OPTIONS);
  res.json({ ok: true });
});

// GET /api/auth/me - returns the logged-in customer, or 401 if not logged in
router.get('/me', requireAuth, async (req, res) => {
  const result = await pool.query(
    'SELECT id, email, company_name, contact_name, phone FROM customers WHERE id = $1',
    [req.customer.id]
  );
  res.json({ customer: result.rows[0] });
});

module.exports = router;
