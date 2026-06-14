-- ============================================================
-- Precision Core Builders — RLS / Anonymous-Access Audit
-- ============================================================
-- Run this in the Supabase SQL editor after EVERY migration (and
-- periodically). It surfaces anonymous-role exposure and gaps in
-- Row-Level Security. None of these queries modify data.
--
-- Background: a generic policy template (e.g. "anon_insert",
-- "service_role_all") was once applied to the leads table, which let
-- unauthenticated callers INSERT rows via the public anon API. The app
-- never needs anon-role policies — public data (the portfolio) is served
-- through tRPC publicProcedures using the service-role key server-side, and
-- admins act as the `authenticated` role. So the expected result of check 1
-- is ZERO rows.
-- ============================================================

-- ── 1. Anonymous-role policies ──────────────────────────────
-- EXPECT: 0 rows. Any row here means the `anon` (unauthenticated) role can
-- read or write that table directly via the Supabase API. Drop each with:
--   DROP POLICY IF EXISTS "<policyname>" ON <tablename>;
SELECT
  tablename,
  policyname,
  cmd,
  roles,
  qual       AS using_expr,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND 'anon' = ANY (roles)
ORDER BY tablename, policyname;

-- ── 2. Public tables with RLS disabled ──────────────────────
-- EXPECT: 0 rows. A table with RLS off is fully exposed to any role that has
-- table grants. Enable with: ALTER TABLE <name> ENABLE ROW LEVEL SECURITY;
SELECT c.relname AS table_without_rls
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relrowsecurity = false
ORDER BY c.relname;

-- ── 3. Overly-permissive policies (USING/CHECK = true) ──────
-- Review each. A blanket `true` is only acceptable for the `service_role`
-- (which bypasses RLS anyway) or a genuinely public read (e.g. published
-- portfolio rows — and even then prefer a scoped predicate).
SELECT
  tablename,
  policyname,
  cmd,
  roles,
  qual       AS using_expr,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND (qual = 'true' OR with_check = 'true')
  AND NOT ('service_role' = ANY (roles))
ORDER BY tablename, policyname;
