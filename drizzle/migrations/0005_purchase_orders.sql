-- Purchase Orders — persist vendor-bucketed POs generated from material
-- shortages by the material-procurement function. Previously POs were built in
-- memory and returned in the HTTP response only; they now survive refreshes.
-- Vendor is a name-string snapshot on the PO (no separate vendor-catalog
-- entity). Apply via Supabase SQL editor or `pnpm db:push`. Idempotent.

-- The purchase_order_status enum is declared in schema.ts; create it here if the
-- type doesn't already exist in the database.
DO $$ BEGIN
  CREATE TYPE purchase_order_status AS ENUM (
    'draft', 'issued', 'partial', 'received', 'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS purchase_orders (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  po_number VARCHAR(100) NOT NULL,
  vendor_name VARCHAR(200) NOT NULL,
  status purchase_order_status NOT NULL DEFAULT 'draft',
  subtotal NUMERIC(12, 2),
  notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_project_id
  ON purchase_orders(project_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status
  ON purchase_orders(status);

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id SERIAL PRIMARY KEY,
  purchase_order_id INTEGER NOT NULL
    REFERENCES purchase_orders(id) ON DELETE CASCADE,
  material_id INTEGER REFERENCES materials(id) ON DELETE SET NULL,
  description VARCHAR(300) NOT NULL,
  quantity NUMERIC(10, 2),
  unit_price NUMERIC(10, 2),
  line_total NUMERIC(12, 2),
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_purchase_order_items_purchase_order_id
  ON purchase_order_items(purchase_order_id);

-- Row-Level Security: both tables are internal, admin-only operations data.
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "purchase_orders_admin_all" ON purchase_orders;
CREATE POLICY "purchase_orders_admin_all"
  ON purchase_orders FOR ALL
  USING (public.is_admin());

DROP POLICY IF EXISTS "purchase_order_items_admin_all" ON purchase_order_items;
CREATE POLICY "purchase_order_items_admin_all"
  ON purchase_order_items FOR ALL
  USING (public.is_admin());
