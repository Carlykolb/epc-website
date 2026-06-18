// routes/admin.js
const express = require('express');
const multer = require('multer');
const { parse } = require('csv-parse/sync');
const pool = require('../db/pool');
const requireAdmin = require('../middleware/requireAdmin');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// POST /api/admin/import-products
// Upload a CSV from the browser (see public/admin-import.html) instead of
// needing a terminal. Expects columns: sku, brand, model, description,
// price, stock_quantity. Existing SKUs are updated; new ones are inserted.
router.post('/import-products', requireAdmin, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file was uploaded.' });
  }

  try {
    const records = parse(req.file.buffer.toString('utf8'), {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    let imported = 0;
    const skipped = [];

    for (const row of records) {
      const sku = row.sku || row.SKU;
      const brand = row.brand || row.Brand;
      const model = row.model || row.Model;
      const description = row.description || row.Description || '';
      const price = parseFloat(row.price || row.Price || 0);
      const stock = parseInt(row.stock_quantity || row.Stock || row.Quantity || 0, 10) || 0;

      if (!sku || !brand || !model) {
        skipped.push(row);
        continue;
      }

      await pool.query(
        `INSERT INTO products (sku, brand, model, description, price, stock_quantity)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (sku) DO UPDATE SET
           brand = EXCLUDED.brand,
           model = EXCLUDED.model,
           description = EXCLUDED.description,
           price = EXCLUDED.price,
           stock_quantity = EXCLUDED.stock_quantity`,
        [sku, brand, model, description, price, stock]
      );
      imported += 1;
    }

    res.json({ imported, skipped_count: skipped.length });
  } catch (err) {
    console.error('Product import error:', err);
    res.status(500).json({ error: 'Could not import that file. Make sure it is a CSV with the expected columns.' });
  }
});

module.exports = router;
