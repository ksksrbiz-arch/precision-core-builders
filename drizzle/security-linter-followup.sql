-- ============================================================
-- Precision Core Builders — Security Linter Follow-up
-- ============================================================
-- Addresses the remaining Supabase database-linter findings that could NOT
-- be closed out by editing rls-policies.sql / ledger-immutability.sql,
-- because the objects involved are not tracked anywhere in this repo.
--
-- ── Two functions — origin still unknown ─────────────────────
--   • function `public.handle_new_user`   — in NEITHER this repo nor the
--                                            dealflow repo (see below)
--   • function `public.rls_auto_enable`   — likewise unaccounted for
--   Both read like Supabase-quickstart / auto-provisioning helpers
--   (`handle_new_user` is the canonical Supabase "sync auth.users → public
--   row" trigger name; `rls_auto_enable` reads as a DDL event trigger).
--   Section 1 REVOKEs their PUBLIC execute grant — safe regardless of which
--   app owns them. Run section 0a and paste the bodies back to place them.
--
-- ── Six tables — NOT PCB's; they belong to the dealflow app ──
--   blog_posts   deals   site_settings   click_logs   email_subscribers   inquiries
--
--   RESOLVED (July 2026): these are the schema of the 1commerce.world
--   "dealflow" app — GitHub repo ksksrbiz-arch/reddit-referral-mark — not
--   Precision Core Builders drift. That repo's feature set maps 1:1 onto
--   them (BlogManager→blog_posts, DealsManager→deals, ContactPage→
--   inquiries, EmailCaptureModal→email_subscribers, track-share/conversion
--   →click_logs, DashboardSettings→site_settings) and its Netlify function
--   hardcodes https://1commerce.world + the literal "dealflow:" prefix. The
--   dealflow app has since moved to a single `key_value_store` table, so
--   these six are almost certainly ORPHANED leftovers from its pre-KV
--   schema, sitting in this project and never cleaned up.
--
--   → Do NOT reconcile them into this repo. The recommended action is to
--     drop them once confirmed dead — see
--     drizzle/dealflow-orphan-tables-cleanup.sql (guarded, drops only empty
--     tables). Section 2 below is retained for the record but its
--     policy-scoping tweak is superseded by that cleanup.
--
-- Run section 0 first (read-only) and paste the output back if you still
-- want the two functions reconciled into tracked migrations.
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
--    (SUPERSEDED — see dealflow-orphan-tables-cleanup.sql)
-- ============================================================
-- ⚠️  These tables belong to the external dealflow app (see header), and
-- the `blog_posts` / `deals` / `site_settings` public-SELECT policies the
-- audit later surfaced are the same app's. The recommended fix is now to
-- DROP all six tables via drizzle/dealflow-orphan-tables-cleanup.sql, which
-- removes both the permissive INSERT policies AND the permissive SELECT
-- policies at once. The `admins_can_read_inquiries` retype below is left
-- for the record but is moot if the table is dropped — and note it lands on
-- a dealflow table, not a PCB one.
--
-- Linter: rls_policy_always_true. All three carry an INSERT policy with
-- WITH CHECK (true), letting the anon key write arbitrary rows.
--
-- UPDATE (after running 0c against the live project): this is NOT the
-- `leads` anon-insert incident repeating. That one was a bare, unpaired
-- "anon_insert" template with no corresponding read-side policy at all —
-- a leftover, not a design. These three are different:
--
--   click_logs         click_logs_insert              INSERT  {public}  check=true
--   email_subscribers  email_subscribers_insert        INSERT  {public}  check=true
--   email_subscribers  email_subscribers_service_all   ALL     {public}  using=auth.role()='service_role'
--   inquiries          public_can_insert_inquiries     INSERT  {public}  check=true
--   inquiries          admins_can_read_inquiries       SELECT  {public}  using=EXISTS(...role='admin'...)
--
-- `inquiries` and `email_subscribers` each pair the public insert with a
-- real read-side policy (admin read / service-role management) — a
-- complete, working design for public-form intake, just never committed
-- to git. And this repo has zero code (grepped client + server + netlify
-- functions) that reads or writes any of the three tables by name, so
-- whatever inserts into them — an embedded widget, a marketing-site form,
-- an external automation — is doing it directly against this anon-insert
-- policy with NO service-role fallback in this codebase. Dropping these
-- would break that intake outright. Do not drop them.
--
-- What IS worth doing, mirroring the is_admin()-exposure fix in
-- rls-policies.sql: scope the read-side policies to `authenticated` so
-- `anon` never needs to evaluate them (harmless today since the `using`
-- clause already resolves false for anon's null auth.uid(), but it's the
-- same defense-in-depth this repo already applies everywhere else).
-- Idempotent — safe to re-run.
DROP POLICY IF EXISTS "admins_can_read_inquiries" ON public.inquiries;
CREATE POLICY "admins_can_read_inquiries"
  ON public.inquiries FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'::user_role
    )
  );
-- email_subscribers_service_all is left as-is: service_role bypasses RLS
-- entirely regardless of any policy, so this one is inert either way.
--
-- click_logs has NO read-side policy at all — right now nothing (other
-- than the service-role key) can read it back, in Supabase or in this
-- app. That may be intentional (write-only telemetry, read via Studio or
-- an external BI tool) or an oversight (data being collected with no admin
-- UI to see it). This script doesn't guess which — flag it to whoever owns
-- the click-tracking integration and add a read policy once you know the
-- intended consumer.
--
-- The WITH CHECK (true) on all three inserts is the accepted trade-off for
-- unauthenticated public-form intake — Postgres RLS can constrain which
-- *rows* get written, not rate-limit *how many*; that needs an app/edge
-- layer (Netlify's form spam filtering, Cloudflare Turnstile, etc.), not a
-- CHECK expression.

-- ============================================================
-- 3. auth_leaked_password_protection
-- ============================================================
-- Not fixable via SQL — it's a Supabase Auth project setting, not a
-- database object. Enable it in the Supabase dashboard:
--   Authentication → Sign In / Providers → Password → "Leaked password
--   protection" (checks new passwords against HaveIBeenPwned).
-- No MCP tool in this session manages Auth config, so this must be
-- toggled manually.
