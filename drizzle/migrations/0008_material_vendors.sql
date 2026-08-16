-- Material ↔ Vendor many-to-many junction.
-- A material may list multiple catalog vendors; materials.vendor_id remains the
-- primary vendor for PO generation / search backward-compat.
-- Apply via Supabase SQL editor or `pnpm db:push`. Idempotent.

CREATE TABLE IF NOT EXISTS material_vendors (
  material_id INTEGER NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  PRIMARY KEY (material_id, vendor_id)
);

CREATE INDEX IF NOT EXISTS idx_material_vendors_vendor_id
  ON material_vendors(vendor_id);

-- Backfill existing single-vendor links into the junction (primary = true).
INSERT INTO material_vendors (material_id, vendor_id, is_primary)
SELECT id, vendor_id, true
FROM materials
WHERE vendor_id IS NOT NULL
ON CONFLICT (material_id, vendor_id) DO NOTHING;

-- Row-Level Security: internal admin-only link table.
ALTER TABLE material_vendors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "material_vendors_admin_all" ON material_vendors;
CREATE POLICY "material_vendors_admin_all"
  ON material_vendors
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );
