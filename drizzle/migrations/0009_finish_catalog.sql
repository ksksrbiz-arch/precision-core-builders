-- Finish catalog — curated, publicly browsable finish products/options for
-- the digital finish showroom. Distinct from finish_selections, which tracks
-- what a specific client picked for their specific project; this table is
-- the source for the public showroom page (client/src/pages/Showroom.tsx).
-- Apply via Supabase SQL editor or `pnpm db:push`. Idempotent.

CREATE TABLE IF NOT EXISTS finish_catalog_items (
  id SERIAL PRIMARY KEY,
  name VARCHAR(300) NOT NULL,
  slug VARCHAR(300) NOT NULL UNIQUE,
  category VARCHAR(100),
  brand VARCHAR(200),
  description TEXT,
  price_tier VARCHAR(20),
  image_url TEXT,
  featured BOOLEAN DEFAULT false,
  published BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_finish_catalog_items_category
  ON finish_catalog_items(category);
CREATE INDEX IF NOT EXISTS idx_finish_catalog_items_published
  ON finish_catalog_items(published);

-- Row-Level Security: admins get full access; anyone else only sees published
-- rows. Mirrors the portfolio_projects policy — the public showroom is served
-- via tRPC publicProcedure + service-role key, so the anon key never queries
-- this table directly and this policy is defense-in-depth.
ALTER TABLE finish_catalog_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "finish_catalog_admin_all" ON finish_catalog_items;
CREATE POLICY "finish_catalog_admin_all"
  ON finish_catalog_items FOR ALL
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "finish_catalog_public_select" ON finish_catalog_items;
CREATE POLICY "finish_catalog_public_select"
  ON finish_catalog_items FOR SELECT
  TO authenticated
  USING (published = true);

-- Seed a handful of clearly-labeled placeholder items so the showroom UI has
-- something to render immediately. Eric replaces these with real products —
-- the "Sample:" prefix and placeholder image make it obvious what needs
-- swapping out.
INSERT INTO finish_catalog_items
  (name, slug, category, brand, description, price_tier, published, featured, sort_order)
VALUES
  ('Sample: White Oak Engineered Flooring', 'sample-white-oak-engineered-flooring', 'Flooring', 'Shaw Floors', 'Wide-plank engineered white oak with a matte finish. Placeholder — replace with a real product and photo.', '$$', true, true, 10),
  ('Sample: Calacatta Quartz Countertop', 'sample-calacatta-quartz-countertop', 'Countertops', 'Caesarstone', 'Bright white quartz with soft grey veining. Placeholder — replace with a real product and photo.', '$$$', true, true, 20),
  ('Sample: Shaker Style Cabinets — Painted White', 'sample-shaker-cabinets-painted-white', 'Cabinets', 'Custom Millwork', 'Full-overlay shaker cabinetry, painted finish. Placeholder — replace with a real product and photo.', '$$', true, false, 30),
  ('Sample: Matte Black Cabinet Hardware', 'sample-matte-black-cabinet-hardware', 'Fixtures', 'Amerock', 'Bar-style pulls in matte black. Placeholder — replace with a real product and photo.', '$', true, false, 40),
  ('Sample: Standing Seam Metal Roofing', 'sample-standing-seam-metal-roofing', 'Roofing', 'Englert', '24-gauge standing seam panel in charcoal. Placeholder — replace with a real product and photo.', '$$$', true, false, 50),
  ('Sample: Warm Greige Interior Paint', 'sample-warm-greige-interior-paint', 'Paint', 'Sherwin-Williams', 'Whole-house neutral, low-VOC. Placeholder — replace with a real product and photo.', '$', true, false, 60)
ON CONFLICT (slug) DO NOTHING;
