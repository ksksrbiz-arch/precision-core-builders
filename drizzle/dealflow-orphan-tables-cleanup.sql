-- ============================================================
-- Dealflow orphan-table cleanup (NOT a Precision Core Builders schema)
-- ============================================================
-- Removes six tables that the Supabase database-linter surfaced inside the
-- PrecisionCore project (mdxfvxycwzauixuphjau) but that DO NOT belong to
-- this repo:
--
--   blog_posts   deals   site_settings   click_logs   email_subscribers   inquiries
--
-- Origin (confirmed July 2026): these are the schema of the 1commerce.world
-- "dealflow" app — GitHub repo ksksrbiz-arch/reddit-referral-mark. Its
-- feature set maps 1:1 onto them (BlogManager→blog_posts, DealsManager→
-- deals, ContactPage→inquiries, EmailCaptureModal→email_subscribers,
-- track-share/conversion→click_logs, DashboardSettings→site_settings), and
-- its Netlify function hardcodes https://1commerce.world and the literal
-- "dealflow:" prefix. That app has since migrated to a single
-- `key_value_store` table (see its MIGRATION.md) and no longer references
-- these six by name — so in this project they are almost certainly LEFTOVER
-- tables from the dealflow app's pre-KV schema, orphaned here and never
-- dropped. Neither this repo NOR the current dealflow repo reads or writes
-- them.
--
-- WHY DROP THEM: while orphaned they still carry the anon-facing policies
-- the linter flagged — public INSERT (WITH CHECK true) on click_logs /
-- email_subscribers / inquiries, and public SELECT (USING true) on
-- blog_posts / deals / site_settings. Dropping the tables removes that
-- exposure AND those linter findings at the source, which is cleaner than
-- rewriting policies on tables nothing uses.
--
-- ⚠️  DESTRUCTIVE. Read before running:
--   • Run this against the PrecisionCore project (mdxfvxycwzauixuphjau) —
--     the same project the linter report and drizzle/rls-policies.sql target.
--   • FIRST confirm they are really orphaned:
--       1. Run PART A below (read-only) and confirm every row_count is 0
--          — or that any non-zero table is genuinely stale.
--       2. Confirm the LIVE 1commerce.world Netlify site's VITE_SUPABASE_URL:
--          if it points at a DIFFERENT project, these are pure orphans here;
--          if it ALSO points at mdxfvxycwzauixuphjau, the dealflow app shares
--          this database — check nothing there still writes these tables
--          before dropping (its current build uses key_value_store, but a
--          stale deploy could differ).
--   • PART B only drops a table when it has ZERO rows. Any table with data
--     is reported and KEPT, so a live table cannot be removed by accident.
--   • The two flagged functions (handle_new_user, rls_auto_enable) are NOT
--     touched here — they appear in neither repo and may be legitimate
--     Supabase auth/DDL helpers; they were only REVOKE'd from PUBLIC in
--     drizzle/security-linter-followup.sql, not dropped.
-- ============================================================

-- ─── PART A — inspect first (read-only) ──────────────────────
-- Returns one row per still-existing table with its live row count. EXPECT
-- every row_count = 0 before running PART B. Uses query_to_xml so the count
-- can be taken from a dynamic table name inside a plain SELECT.
SELECT
  t AS table_name,
  (xpath(
    '/row/c/text()',
    query_to_xml(format('SELECT count(*) AS c FROM public.%I', t), false, true, '')
  ))[1]::text::bigint AS row_count
FROM unnest(ARRAY[
  'blog_posts', 'deals', 'site_settings',
  'click_logs', 'email_subscribers', 'inquiries'
]) AS t
WHERE to_regclass('public.' || quote_ident(t)) IS NOT NULL
ORDER BY table_name;

-- If any row_count is > 0 and you want to eyeball recency before deciding,
-- inspect that table directly in the Supabase Table Editor (or
-- SELECT ... ORDER BY <its timestamp column> DESC LIMIT 5) — PART B will
-- refuse to drop it anyway.

-- ─── PART B — guarded drop (destructive) ─────────────────────
-- Drops each table ONLY if it is empty. Non-empty tables are reported via
-- RAISE NOTICE and left in place. Runs as one transaction: if any DROP hits
-- an unexpected dependency (e.g. a foreign key from something you didn't
-- know about), the whole block rolls back and nothing is dropped — that
-- error is itself a signal the table is not as orphaned as assumed.
--
-- Uncomment the block below to run it.
/*
DO $$
DECLARE
  t   text;
  n   bigint;
  tbls text[] := ARRAY[
    'blog_posts', 'deals', 'site_settings',
    'click_logs', 'email_subscribers', 'inquiries'
  ];
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    IF to_regclass('public.' || quote_ident(t)) IS NULL THEN
      RAISE NOTICE 'skip %  — does not exist', t;
      CONTINUE;
    END IF;

    EXECUTE format('SELECT count(*) FROM public.%I', t) INTO n;

    IF n > 0 THEN
      RAISE NOTICE 'KEEP %  — % row(s) present; not dropping. Investigate first.', t, n;
    ELSE
      EXECUTE format('DROP TABLE public.%I', t);
      RAISE NOTICE 'DROPPED %  — was empty.', t;
    END IF;
  END LOOP;
END $$;
*/

-- After running PART B, re-run drizzle/anon-policy-audit.sql: dropping the
-- tables also drops their policies, so checks 1 and 3 should come back
-- clean (no more public blog_posts/deals/site_settings/click_logs/
-- email_subscribers/inquiries rows).
