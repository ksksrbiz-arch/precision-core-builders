-- AI usage — one row per LLM call (cost / governance dashboard).
-- Written best-effort by server/_core/aiUsage.ts (service role) and read by the
-- admin-only /api/ai-usage function. Apply via the Supabase SQL editor or
-- `pnpm db:push`. Idempotent.
--
-- This table was defined in drizzle/schema.ts but never shipped as a migration,
-- so the AI Usage panel reported "table not available" (pointing at a
-- non-existent "0005_ai_usage" migration), and — if it had been created by an
-- ad-hoc push — it would have had no RLS, i.e. been readable/writable through
-- the public anon key. RLS is enabled below with an admin-only policy; the
-- service role used by the server bypasses RLS.

CREATE TABLE IF NOT EXISTS ai_usage (
  id SERIAL PRIMARY KEY,
  feature VARCHAR(60) NOT NULL,
  provider VARCHAR(20) NOT NULL,
  model VARCHAR(120),
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  -- NULL for the shared admin session / dev bypass (non-UUID ids).
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_created ON ai_usage(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_usage_provider ON ai_usage(provider);
CREATE INDEX IF NOT EXISTS idx_ai_usage_feature ON ai_usage(feature);

ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

-- Admin-only: usage/cost metrics are an internal operations view.
DROP POLICY IF EXISTS "Admins can read ai usage" ON ai_usage;
CREATE POLICY "Admins can read ai usage"
  ON ai_usage FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
  ));
