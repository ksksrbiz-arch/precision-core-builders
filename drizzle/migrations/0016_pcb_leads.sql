-- pcb_leads — this app's lead board, in its own table.
--
-- Why a new table: production already has a `leads` table, but it is NOT the one
-- this app expects. It is a legacy table (uuid `id`, `email TEXT NOT NULL`,
-- `status`, …) that predates the Digital Foreman. Migration 0004 created ours with
-- CREATE TABLE IF NOT EXISTS, which silently did nothing against it. The result:
-- the website's inquiry handler (netlify/functions/submission-created.ts) inserts
-- no `email`, so every insert would be rejected, and the handler swallows errors
-- and returns 200 — inquiries never reached the Command Center lead board. The
-- board's delete/clear also used integer ids against a uuid column.
--
-- Fix: give this app its own namespaced table and leave the legacy `leads` table
-- alone (it holds 0 rows today and is not ours to drop). Additive and idempotent:
-- nothing is dropped or altered, so it is safe to apply before the code switches
-- over; until then the old code keeps reading the legacy table exactly as before.
--
-- Apply via the Supabase SQL editor / connector or `pnpm db:push`.

-- Already present in production; created here only for a fresh database.
DO $$ BEGIN
  CREATE TYPE lead_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS pcb_leads (
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

CREATE INDEX IF NOT EXISTS idx_pcb_leads_priority ON pcb_leads(priority);
CREATE INDEX IF NOT EXISTS idx_pcb_leads_created ON pcb_leads(created_at DESC);

ALTER TABLE pcb_leads ENABLE ROW LEVEL SECURITY;

-- Admin-only: the lead board is an internal operations tool. Every write goes
-- through the server with the service-role key (which bypasses RLS); no browser
-- role gets any other access, and anon gets none.
DROP POLICY IF EXISTS "pcb_leads_admin_all" ON pcb_leads;
CREATE POLICY "pcb_leads_admin_all"
  ON pcb_leads FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
