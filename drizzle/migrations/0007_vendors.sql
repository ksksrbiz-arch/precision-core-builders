-- Vendors — standalone, deduped supplier catalog Eric maintains. Materials and
-- purchase orders may reference a vendor via a nullable vendor_id FK; the
-- existing free-text vendor columns on those tables are left intact (additive).
-- Apply via Supabase SQL editor or `pnpm db:push`. Idempotent.

CREATE TABLE IF NOT EXISTS vendors (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  contact_name VARCHAR(200),
  email VARCHAR(320),
  phone VARCHAR(20),
  website TEXT,
  address TEXT,
  category VARCHAR(120),
  account_number VARCHAR(120),
  payment_terms VARCHAR(120),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vendors_name ON vendors(name);
CREATE INDEX IF NOT EXISTS idx_vendors_category ON vendors(category);

-- Additive nullable FKs on materials and purchase_orders. Existing free-text
-- vendor columns (vendor_name, etc.) are untouched.
ALTER TABLE materials
  ADD COLUMN IF NOT EXISTS vendor_id INTEGER
    REFERENCES vendors(id) ON DELETE SET NULL;

ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS vendor_id INTEGER
    REFERENCES vendors(id) ON DELETE SET NULL;

-- Row-Level Security: vendors are internal, admin-only supplier data.
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vendors_admin_all" ON vendors;
CREATE POLICY "vendors_admin_all"
  ON vendors FOR ALL
  USING (public.is_admin());
