// db/seed-products.js
//
// Imports products from a CSV file into the products table.
// Usage:  npm run seed -- path/to/products.csv
//
// Expects these column headers in the CSV (rename/remap below if your
// file's headers are different - e.g. your original spreadsheet columns):
//   sku, brand, model, description, price, stock_quantity
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const pool = require('./pool');

async function main() {
  const csvPath = process.argv[2];
  if (!csvPath) {
    console.error('Usage: npm run seed -- path/to/products.csv');
    process.exit(1);
  }

  const fileContent = fs.readFileSync(path.resolve(csvPath), 'utf8');
  const records = parse(fileContent, { columns: true, skip_empty_lines: true, trim: true });

  console.log(`Found ${records.length} rows in ${csvPath}. Importing...`);

  let imported = 0;
  for (const row of records) {
    const sku = row.sku || row.SKU;
    const brand = row.brand || row.Brand;
    const model = row.model || row.Model;
    const description = row.description || row.Description || '';
    const price = parseFloat(row.price || row.Price || 0);
    const stock = parseInt(row.stock_quantity || row.Stock || row.Quantity || 0, 10) || 0;

    if (!sku || !brand || !model) {
      console.warn('Skipping row missing sku/brand/model:', row);
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

  console.log(`Done. Imported/updated ${imported} products.`);
  await pool.end();
}

main().catch((err) => {
  console.error('Seed script failed:', err);
  process.exit(1);
});
