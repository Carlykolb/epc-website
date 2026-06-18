// middleware/requireAuth.js
const jwt = require('jsonwebtoken');

// Protects a route - rejects the request with 401 unless a valid login
// cookie is present. On success, attaches { id, email } to req.customer.
function requireAuth(req, res, next) {
  const token = req.cookies && req.cookies.token;

  if (!token) {
    return res.status(401).json({ error: 'Please log in to continue.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.customer = { id: payload.id, email: payload.email };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Your session has expired. Please log in again.' });
  }
}

module.exports = requireAuth;
