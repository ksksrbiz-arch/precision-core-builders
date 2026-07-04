-- ============================================================
-- Precision Core Builders — Security Linter Follow-up
-- ============================================================
-- Addresses the remaining Supabase database-linter findings that could NOT
-- be closed out by editing rls-policies.sql / ledger-immutability.sql,
-- because the objects involved are not tracked anywhere in this repo:
--
--   • function `public.handle_new_user`   — no matching definition in git
--   • function `public.rls_auto_enable`   — no matching definition in git
--   • table    `public.click_logs`        — no matching definition in git
--   • table    `public.email_subscribers` — no matching definition in git
--   • table    `public.inquiries`         — no matching definition in git
--
-- These were created directly against the live database (Supabase SQL
-- editor / dashboard) and never made it into drizzle/schema.ts or any
-- drizzle/*.sql file. That's schema drift: git is no longer the source of
-- truth for these five objects. Run section 0 first and paste the output
-- back so the drift can be reconciled into tracked migrations.
-- ============================================================

-- ─── 0. Diagnostics — read-only, run this first ──────────────
-- Pulls the actual live definitions so they can be committed to git.

-- 0a. Function bodies (confirms args/volatility/security before touching them)
SELECT p.proname, pg_get_functiondef(p.oid) AS definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('handle_new_user', 'rls_auto_enable');

-- 0b. Table columns for the three untracked tables
SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('click_logs', 'email_subscribers', 'inquiries')
ORDER BY table_name, ordinal_position;

-- 0c. Existing policies on those same tables (full detail, not just INSERT)
SELECT tablename, policyname, cmd, roles, qual AS using_expr, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('click_logs', 'email_subscribers', 'inquiries')
ORDER BY tablename, policyname;

-- ============================================================
-- 1. handle_new_user() / rls_auto_enable() — RPC exposure
-- ============================================================
-- Linter: anon_security_definer_function_executable /
-- authenticated_security_definer_function_executable.
--
-- Postgres grants EXECUTE to PUBLIC on every new function unless revoked,
-- which is what makes these callable directly via
-- /rest/v1/rpc/handle_new_user and /rest/v1/rpc/rls_auto_enable.
--
-- Names + zero-argument signature (confirmed via the linter metadata) are
-- consistent with the two of them being trigger/event-trigger handlers
-- (`handle_new_user` is the exact name of Supabase's own quickstart
-- "sync auth.users -> public row" trigger template; `rls_auto_enable`
-- reads as a DDL event trigger that force-enables RLS on new tables).
-- Trigger and event-trigger firing does NOT require the invoking role to
-- hold EXECUTE on the handler — only direct SQL/RPC calls do — so revoking
-- PUBLIC's execute grant is safe *if* that's really what these are, and
-- this repo has zero `supabase.rpc(...)` calls referencing either name
-- (verified — grep found none client- or server-side).
--
-- Still: confirm against the 0a output above before running this. If
-- either turns out to be a plain SQL-callable helper (not a trigger body),
-- keep the GRANT TO authenticated line for it; drop it otherwise.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC;

-- ============================================================
-- 2. click_logs / email_subscribers / inquiries — permissive INSERT
-- ============================================================
-- Linter: rls_policy_always_true. All three carry an INSERT policy with
-- WITH CHECK (true), letting the anon key write arbitrary rows.
--
-- This is the SAME anti-pattern anon-policy-audit.sql was written to catch
-- after it happened once already on `leads` (see that file's header): a
-- generic "anon_insert" policy template applied to a table that should
-- only ever be written server-side. Per docs/CCB_COMPLIANCE.md §3.3 this
-- app never relies on anon-role access — public form submissions go
-- through a tRPC publicProcedure or a Netlify Function (service-role key),
-- exactly like netlify/functions/submission-created.ts does for the
-- Netlify Forms → `leads` path.
--
-- DO NOT uncomment/run the DROPs below blind. This script has no way to
-- confirm whether some external integration (an embedded newsletter
-- widget, a click-tracking pixel, an n8n/Make scenario, etc.) is currently
-- relying on this exact anon-insert path with no server-side fallback —
-- dropping it would break that intake with zero warning. Confirm first
-- (check Netlify Forms config, n8n workflows, and anything embedded in the
-- marketing pages that posts to Supabase directly), stand up an equivalent
-- service-role insert path if one doesn't already exist, and only then
-- run:
--
-- DROP POLICY IF EXISTS "click_logs_insert" ON public.click_logs;
-- DROP POLICY IF EXISTS "email_subscribers_insert" ON public.email_subscribers;
-- DROP POLICY IF EXISTS "public_can_insert_inquiries" ON public.inquiries;

-- ============================================================
-- 3. auth_leaked_password_protection
-- ============================================================
-- Not fixable via SQL — it's a Supabase Auth project setting, not a
-- database object. Enable it in the Supabase dashboard:
--   Authentication → Sign In / Providers → Password → "Leaked password
--   protection" (checks new passwords against HaveIBeenPwned).
-- No MCP tool in this session manages Auth config, so this must be
-- toggled manually.
