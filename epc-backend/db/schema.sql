-- db/schema.sql
-- Run this once against your DigitalOcean Managed Database to create the
-- tables this app needs. Example:
--   psql "$DATABASE_URL" -f db/schema.sql

CREATE TABLE IF NOT EXISTS customers (
  id            SERIAL PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  company_name  TEXT,
  contact_name  TEXT,
  phone         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id             SERIAL PRIMARY KEY,
  sku            TEXT NOT NULL UNIQUE,
  brand          TEXT NOT NULL,
  model          TEXT NOT NULL,
  description    TEXT,
  price          NUMERIC(10, 2) NOT NULL,
  stock_quantity INTEGER DEFAULT 0,
  image_url      TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_brand ON products (brand);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products (sku);

CREATE TABLE IF NOT EXISTS orders (
  id                      SERIAL PRIMARY KEY,
  customer_id             INTEGER NOT NULL REFERENCES customers(id),
  stripe_session_id       TEXT UNIQUE,
  stripe_payment_intent_id TEXT,
  status                  TEXT NOT NULL DEFAULT 'pending', -- pending | paid | fulfilled | cancelled
  total_amount            NUMERIC(10, 2) NOT NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
  id          SERIAL PRIMARY KEY,
  order_id    INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id  INTEGER NOT NULL REFERENCES products(id),
  quantity    INTEGER NOT NULL,
  unit_price  NUMERIC(10, 2) NOT NULL
);
