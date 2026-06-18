// middleware/requireAdmin.js
// A simple shared-secret check for the one admin task you'll do yourself
// (importing the product list). This is intentionally separate from
// customer login - it's just you, not a customer account.
function requireAdmin(req, res, next) {
  const key = req.headers['x-admin-key'];
  if (!process.env.ADMIN_IMPORT_KEY || key !== process.env.ADMIN_IMPORT_KEY) {
    return res.status(401).json({ error: 'Incorrect admin key.' });
  }
  next();
}

module.exports = requireAdmin;
