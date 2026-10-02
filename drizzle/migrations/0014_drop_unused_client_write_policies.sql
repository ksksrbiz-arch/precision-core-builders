-- Remove browser-writable RLS policies the app never uses.
--
-- All writes in this app go through the server (tRPC / Netlify functions) with
-- the service-role key, which bypasses RLS; the browser only SELECTs (Realtime
-- subscriptions and the signed-in user's own `users` row). Yet these policies
-- let any signed-in client write straight to the database with the public anon
-- key + their own JWT:
--
--   finish_selections_client_update  UPDATE own selections with NO column limit:
--       set unit_price / total_cost / budget_delta, or eric_approved = true
--       (approve on Eric's behalf). The portal's server code recomputes none of
--       this, so a tampered row is trusted.
--   finish_selections_client_insert  create a selection for ANY project_id (only
--       client_id was checked) with arbitrary prices.
--   users_self_update / users_update_own  edit your own users row (the role
--       column is separately guarded by 0013; this removes the rest of the
--       surface — email, name, last_signed_in).
--   clients_self_update  rewrite your own client record.
--
-- Admin access (`*_admin_all`) and every SELECT policy are untouched, so
-- Realtime, the portal's reads and useAuth's role lookup keep working.
-- Idempotent.

DROP POLICY IF EXISTS finish_selections_client_update ON public.finish_selections;
DROP POLICY IF EXISTS finish_selections_client_insert ON public.finish_selections;
DROP POLICY IF EXISTS users_self_update ON public.users;
DROP POLICY IF EXISTS users_update_own ON public.users;
DROP POLICY IF EXISTS clients_self_update ON public.clients;
