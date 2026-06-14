-- Leads — persisted AI-scored lead prioritization board (Command Center).
-- Replaces the prior localStorage-only board. Apply via Supabase SQL editor
-- or `pnpm db:push`. Idempotent.

-- The lead_priority enum is declared in schema.ts; create it here if the type
-- doesn't already exist in the database.
DO $$ BEGIN
  CREATE TYPE lead_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS leads (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  project_type VARCHAR(120),
  budget VARCHAR(120),
  location VARCHAR(200),
  timeline VARCHAR(120),
  message TEXT,
  score INTEGER NOT NULL DEFAULT 0,
  priority lead_priority NOT NULL DEFAULT 'low',
  reasoning TEXT,
  suggested_action TEXT,
  estimated_value NUMERIC(12, 2),
  scored_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leads_priority ON leads(priority);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at DESC);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Admin-only: the lead board is an internal operations tool.
DROP POLICY IF EXISTS "Admins can manage leads" ON leads;
CREATE POLICY "Admins can manage leads"
  ON leads FOR ALL
  USING (EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
  ));
