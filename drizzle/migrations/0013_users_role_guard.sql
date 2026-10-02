-- SECURITY: stop signed-in users from promoting themselves to admin.
--
-- Found by auditing the production database (2026-10-02): the RLS policies
-- `users_self_update` / `users_update_own` let any signed-in user UPDATE their
-- own public.users row, and `authenticated` holds UPDATE on every column — so
-- with the public anon key and their own JWT, anyone could run
--   PATCH /rest/v1/users?id=eq.<me>   {"role":"admin"}
-- and become admin (the API trusts public.users.role, and every admin RLS
-- policy reads it). Reproduced in a rolled-back transaction: role -> admin.
--
-- Fix, in three independent parts. Idempotent.

-- ─── 1. Only an admin (or the server/DB owner) may change a role ─────────────
-- PostgREST requests run as `authenticated` / `anon`. Server code (service
-- role), SECURITY DEFINER triggers and the SQL editor run as other roles and
-- are unaffected.
CREATE OR REPLACE FUNCTION public.guard_user_role_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     AND current_user IN ('authenticated', 'anon')
     AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Changing a user role is not permitted'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER guard_user_role_change
  BEFORE UPDATE OF role ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.guard_user_role_change();

-- ─── 2. Pre-approved admin emails are promoted only once the email is confirmed
-- handle_new_user() used to grant admin at sign-up, before the address was
-- proven. It now grants it only for an already-confirmed email, and a new
-- trigger promotes the account the moment the email is confirmed.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  assigned_role user_role := 'user'::user_role;
BEGIN
  IF new.email_confirmed_at IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.admin_emails
    WHERE lower(email) = lower(new.email)
  ) THEN
    assigned_role := 'admin'::user_role;
  END IF;

  INSERT INTO public.users (id, email, name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name'),
    assigned_role
  )
  ON CONFLICT (id) DO UPDATE
    SET
      email = EXCLUDED.email,
      name = COALESCE(EXCLUDED.name, public.users.name),
      role = CASE
        WHEN public.users.role = 'admin'::user_role THEN 'admin'::user_role
        ELSE EXCLUDED.role
      END,
      last_signed_in = now(),
      updated_at = now();

  RETURN new;
EXCEPTION
  WHEN others THEN
    -- Log but don't block auth signup
    RAISE WARNING 'handle_new_user failed for %: %', new.email, SQLERRM;
    RETURN new;
END;
$$;

CREATE OR REPLACE FUNCTION public.promote_confirmed_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.email_confirmed_at IS NULL
     AND NEW.email_confirmed_at IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM public.admin_emails
       WHERE lower(email) = lower(NEW.email)
     ) THEN
    UPDATE public.users
    SET role = 'admin'::user_role, updated_at = now()
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_confirmed
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.promote_confirmed_admin();

-- ─── 3. Trigger functions are not RPC endpoints ──────────────────────────────
-- They were executable by anon/authenticated through /rest/v1/rpc/*. Triggers
-- don't need the invoker to hold EXECUTE, so nothing that fires them breaks.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.promote_confirmed_admin() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_user_role_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
