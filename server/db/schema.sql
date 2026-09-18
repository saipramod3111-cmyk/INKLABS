CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- A "booking" in POD terms: nothing is deducted from stock, the order is just logged.
CREATE TABLE IF NOT EXISTS orders (
  id               SERIAL PRIMARY KEY,
  user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status           TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'in_production', 'shipped', 'delivered')),
  subtotal         NUMERIC(10,2) NOT NULL,
  shipping_cost    NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_price      NUMERIC(10,2) NOT NULL,
  shipping_address JSONB NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  id                    SERIAL PRIMARY KEY,
  order_id              INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_type          TEXT NOT NULL CHECK (product_type IN ('tshirt', 'hoodie')),
  color                 TEXT NOT NULL,
  size                  TEXT NOT NULL,
  neckline              TEXT CHECK (neckline IN ('round', 'vneck', 'polo')),
  sleeve_length         TEXT CHECK (sleeve_length IN ('half', 'full')),
  hoodie_type           TEXT CHECK (hoodie_type IN ('pullover', 'zip')),
  hood_style            TEXT CHECK (hood_style IN ('regular', 'oversized')),
  design_image_url      TEXT,
  back_design_image_url TEXT,
  design_config         JSONB,
  thumbnail_url         TEXT,
  price                 NUMERIC(10,2) NOT NULL,
  quantity              INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0)
);

CREATE TABLE IF NOT EXISTS payments (
  id                SERIAL PRIMARY KEY,
  order_id          INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  stripe_payment_id TEXT,
  stripe_session_id TEXT UNIQUE,
  amount            NUMERIC(10,2) NOT NULL,
  currency          TEXT NOT NULL DEFAULT 'usd',
  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Style columns added after the initial release; upgrades existing databases in place.
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS neckline      TEXT CHECK (neckline IN ('round', 'vneck', 'polo'));
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS sleeve_length TEXT CHECK (sleeve_length IN ('half', 'full'));
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS hoodie_type   TEXT CHECK (hoodie_type IN ('pullover', 'zip'));
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS hood_style    TEXT CHECK (hood_style IN ('regular', 'oversized'));

CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
