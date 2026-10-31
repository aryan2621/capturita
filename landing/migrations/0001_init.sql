-- Capturita site: one product, one-time purchase. Money is integer paise.
CREATE TABLE customers (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,          -- stored lowercase
  name TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE orders (
  id TEXT PRIMARY KEY,                 -- ord_...
  customer_id TEXT NOT NULL REFERENCES customers(id),
  razorpay_order_id TEXT NOT NULL UNIQUE,
  amount_paise INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  -- 'expired' = pending for over 30 min; a late payment still fulfils it.
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','expired','paid','refunded')),
  razorpay_payment_id TEXT UNIQUE,     -- the one payment that fulfilled this order
  terms_accepted_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  paid_at INTEGER,
  refunded_at INTEGER,
  refund_id TEXT,
  refund_reason TEXT
);
CREATE INDEX idx_orders_customer ON orders(customer_id);
-- At most one open checkout per buyer (the single product): concurrent checkouts cannot both create one.
CREATE UNIQUE INDEX idx_orders_one_open ON orders(customer_id) WHERE status = 'pending';
CREATE INDEX idx_orders_created ON orders(created_at);

CREATE TABLE payments (
  id TEXT PRIMARY KEY,                 -- pay_... (Razorpay); PK makes fulfil idempotent
  order_id TEXT NOT NULL REFERENCES orders(id),
  amount_paise INTEGER NOT NULL,
  method TEXT,
  -- 'captured' fulfilled the order; a second capture on an order is 'duplicate_refunded' (auto-refunded)
  -- or 'needs_refund' (auto-refund failed: owner refunds it in the Razorpay dashboard).
  status TEXT NOT NULL DEFAULT 'captured' CHECK (status IN ('captured','duplicate_refunded','needs_refund')),
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_payments_order ON payments(order_id);

CREATE TABLE licenses (
  id TEXT PRIMARY KEY,                 -- lic_...
  order_id TEXT NOT NULL UNIQUE REFERENCES orders(id),  -- one key per order
  customer_id TEXT NOT NULL REFERENCES customers(id),
  key TEXT NOT NULL,
  issued_at INTEGER NOT NULL,
  updates_until INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked')),
  revoked_at INTEGER,
  revoked_reason TEXT
);

-- Razorpay webhook events, keyed by X-Razorpay-Event-Id so retries are no-ops.
CREATE TABLE events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  received_at INTEGER NOT NULL,
  processed_at INTEGER,
  error TEXT
);
