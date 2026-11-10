PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name     TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  phone         TEXT,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('admin', 'seller', 'consumer')),
  is_active     INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE seller_profiles (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id             INTEGER NOT NULL UNIQUE REFERENCES users (id),
  business_name       TEXT NOT NULL,
  registration_number TEXT,
  business_address    TEXT,
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
  rejection_reason    TEXT,
  reviewed_by         INTEGER REFERENCES users (id),   -- admin who reviewed
  reviewed_at         TEXT,
  created_at          TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  seller_id        INTEGER REFERENCES seller_profiles (id),   -- null when platform-sourced
  source           TEXT NOT NULL CHECK (source IN ('seller', 'platform')),
  name             TEXT NOT NULL,
  description      TEXT,
  category         TEXT,                                      -- e.g. Flour, Oil, Vegetables
  unit             TEXT NOT NULL,                             -- e.g. 1kg, 2L bottle
  image_url        TEXT,
  wholesale_price  NUMERIC NOT NULL,
  retail_price     NUMERIC NOT NULL,                          -- used for savings comparison
  stock_quantity   INTEGER NOT NULL DEFAULT 0,
  approval_status  TEXT NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  reviewed_by      INTEGER REFERENCES users (id),
  reviewed_at      TEXT,
  created_at       TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE locations (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  name             TEXT NOT NULL UNIQUE,                      -- e.g. Kasarani, Westlands
  delivery_fee     NUMERIC NOT NULL DEFAULT 0,                -- flat fee per order for delivery to this area
  collection_point TEXT,                                      -- where shoppers collect in this area
  is_active        INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1))   -- inactive areas disappear from checkout
);

CREATE TABLE campaigns (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id         INTEGER NOT NULL REFERENCES products (id),
  created_by         INTEGER NOT NULL REFERENCES users (id),  -- admin
  title              TEXT NOT NULL,
  campaign_price     NUMERIC NOT NULL,                        -- copied from product wholesale_price at creation
  platform_charge    NUMERIC NOT NULL DEFAULT 0,              -- per unit
  min_quantity       INTEGER NOT NULL,                        -- campaign succeeds if reached by deadline
  max_quantity       INTEGER NOT NULL,                        -- seller stock; closes to new orders when full
  min_order_quantity INTEGER NOT NULL DEFAULT 1,              -- smallest order allowed
  max_per_user       INTEGER,                                 -- optional cap per person across all their orders in this campaign
  deadline           TEXT NOT NULL,
  cancellation_cutoff TEXT NOT NULL,                          -- default: deadline minus 3 days
  status             TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'successful', 'failed', 'fulfilling', 'completed', 'cancelled')),
  closed_at          TEXT,
  stock_confirmed_at TEXT,                                    -- seller confirms stock
  created_at         TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE orders (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  order_no         TEXT NOT NULL UNIQUE,
  campaign_id      INTEGER NOT NULL REFERENCES campaigns (id),
  consumer_id      INTEGER NOT NULL REFERENCES users (id),
  quantity         INTEGER NOT NULL,
  unit_price       NUMERIC NOT NULL,                          -- snapshot
  platform_charge  NUMERIC NOT NULL DEFAULT 0,                -- snapshot, per unit
  logistics_charge NUMERIC NOT NULL DEFAULT 0,                -- snapshot, flat per order; 0 for collection
  total_amount     NUMERIC NOT NULL,                          -- quantity x (unit_price + platform_charge) + logistics_charge
  fulfilment       TEXT NOT NULL CHECK (fulfilment IN ('delivery', 'collection')),
  location_id      INTEGER NOT NULL REFERENCES locations (id),   -- delivery area or collection area
  delivery_address TEXT,                                      -- street address, delivery only
  status           TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('paid', 'confirmed', 'preparing', 'dispatched', 'ready_for_collection', 'completed', 'cancelled', 'refunded')),
  cancelled_at     TEXT,
  created_at       TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payments (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id  INTEGER NOT NULL REFERENCES orders (id),
  amount    NUMERIC NOT NULL,
  method    TEXT NOT NULL DEFAULT 'simulated_mpesa',
  reference TEXT,
  status    TEXT NOT NULL DEFAULT 'successful' CHECK (status IN ('successful', 'refunded')),
  paid_at   TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE refunds (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  payment_id   INTEGER NOT NULL UNIQUE REFERENCES payments (id),
  order_id     INTEGER NOT NULL REFERENCES orders (id),
  amount       NUMERIC NOT NULL,
  reason       TEXT NOT NULL CHECK (reason IN ('consumer_cancelled', 'campaign_failed')),
  processed_by INTEGER REFERENCES users (id),                 -- null when automatic
  processed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_status_history (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id   INTEGER NOT NULL REFERENCES orders (id),
  status     TEXT NOT NULL CHECK (status IN ('paid', 'confirmed', 'preparing', 'dispatched', 'ready_for_collection', 'completed', 'cancelled', 'refunded')),
  note       TEXT,
  updated_by INTEGER REFERENCES users (id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE settlements (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  seller_id   INTEGER NOT NULL REFERENCES seller_profiles (id),
  campaign_id INTEGER NOT NULL REFERENCES campaigns (id),
  amount      NUMERIC NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  settled_at  TEXT
);

CREATE TABLE notifications (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users (id),
  message    TEXT NOT NULL,
  is_read    INTEGER NOT NULL DEFAULT 0 CHECK (is_read IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX settlements_index_0 ON settlements (seller_id, campaign_id);