-- ============================================================
-- Admin email allowlist
-- ============================================================
-- Grants `role = 'admin'` in public.users to a fixed allowlist of
-- email addresses so they can sign in via magic link and land on
-- the /admin dashboard (see client/src/pages/auth/Callback.tsx,
-- which reads public.users.role to choose the destination).
--
-- Apply in the Supabase SQL editor (or via psql against the
-- Supabase database URL). Safe to re-run — it is idempotent.
-- ============================================================

-- ─── 1. Allowlist helper ─────────────────────────────────────
-- Single source of truth for which emails are admins. Edit the
-- ARRAY[...] literal to add or remove admins, then re-run this
-- migration; the trigger and backfill below will pick up the
-- change.
CREATE OR REPLACE FUNCTION public.is_admin_email(p_email text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(coalesce(p_email, '')) = ANY (ARRAY[
    'skdev@1commerce.online',
    'erictadlock@precisioncorebuilders.com'
  ]);
$$;

-- ─── 2. Upsert helper for auth → public.users sync ───────────
-- SECURITY DEFINER so it can write to public.users regardless of
-- the caller's RLS context (the trigger fires under the auth
-- service role, but we keep this explicit for safety).
CREATE OR REPLACE FUNCTION public.handle_new_admin_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.user_role;
BEGIN
  IF NEW.email IS NULL THEN
    RETURN NEW;
  END IF;

  IF public.is_admin_email(NEW.email) THEN
    v_role := 'admin';
  ELSE
    v_role := 'user';
  END IF;

  INSERT INTO public.users (id, email, role, last_signed_in)
  VALUES (NEW.id, NEW.email, v_role, now())
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        -- Only upgrade to admin from the allowlist; never silently
        -- downgrade an existing admin who isn't on the list.
        role = CASE
          WHEN public.is_admin_email(EXCLUDED.email) THEN 'admin'::public.user_role
          ELSE public.users.role
        END,
        last_signed_in = now(),
        updated_at = now();

  RETURN NEW;
END;
$$;

-- ─── 3. Trigger on auth.users ────────────────────────────────
-- Fires on INSERT (new signup) and UPDATE (email change, magic
-- link confirmation) so allow-listed accounts get the admin role
-- the first time Supabase Auth sees them.
DROP TRIGGER IF EXISTS on_auth_user_admin_sync ON auth.users;
CREATE TRIGGER on_auth_user_admin_sync
  AFTER INSERT OR UPDATE OF email ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_admin_user();

-- ─── 4. Backfill existing accounts ───────────────────────────
-- Insert a public.users row for any already-existing auth.users
-- entry on the allowlist, or upgrade an existing row to admin.
INSERT INTO public.users (id, email, role, last_signed_in)
SELECT au.id, au.email, 'admin'::public.user_role, now()
FROM auth.users au
WHERE public.is_admin_email(au.email)
ON CONFLICT (id) DO UPDATE
  SET role = 'admin'::public.user_role,
      email = EXCLUDED.email,
      updated_at = now();
