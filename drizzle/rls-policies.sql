-- ============================================================
-- Precision Core Builders — Row-Level Security Policies
-- ============================================================
-- Run this SQL in the Supabase SQL editor after applying the
-- Drizzle schema migration (pnpm db:push).
--
-- Design principles:
--   • Admins (role = 'admin' in public.users) have unrestricted access.
--   • Clients can only read/write data belonging to their own account.
--     A client's identity is established by matching auth.uid() to
--     clients.user_id, then following project/client_id foreign keys.
--   • The public can only read published portfolio projects.
--   • All other tables are private by default.
--
-- Helper function: is_admin()
--   Returns TRUE when the calling JWT belongs to a user whose role
--   in public.users is 'admin'.  Uses SECURITY DEFINER so RLS on
--   the users table itself doesn't block the lookup.
--
-- Performance note:
--   The idx_users_id_role index below is critical on Nano tier
--   (t4g.nano) — every admin EXISTS sub-query in every policy
--   would otherwise trigger a table scan on public.users.
-- ============================================================

-- ─── Performance Index (run first — used by every admin check) ─
CREATE INDEX IF NOT EXISTS idx_users_id_role
  ON public.users (id, role);

COMMENT ON INDEX idx_users_id_role IS
  'Supports fast admin role checks in RLS policies. Critical for Nano tier performance when RLS is active.';

-- ─── Helper: is_admin() ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
      AND role = 'admin'
  );
$$;

-- ─── Helper: client_id_for_user() ────────────────────────────
-- Returns the clients.id for the authenticated user (or NULL).
CREATE OR REPLACE FUNCTION public.client_id_for_user()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.clients
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

-- ============================================================
-- 1. users
--    • Admins: full access.
--    • Users: can read/update their own row only.
-- ============================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_admin_all"
  ON public.users FOR ALL
  USING (public.is_admin());

CREATE POLICY "users_self_select"
  ON public.users FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "users_self_update"
  ON public.users FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ============================================================
-- 2. clients
--    • Admins: full access.
--    • Clients: can select/update their own row.
-- ============================================================
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clients_admin_all"
  ON public.clients FOR ALL
  USING (public.is_admin());

CREATE POLICY "clients_self_select"
  ON public.clients FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "clients_self_update"
  ON public.clients FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 3. projects
--    • Admins: full access.
--    • Clients: can read projects where they are the client AND
--      client_portal_enabled = true.
-- ============================================================
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "projects_admin_all"
  ON public.projects FOR ALL
  USING (public.is_admin());

CREATE POLICY "projects_client_select"
  ON public.projects FOR SELECT
  USING (
    client_id = public.client_id_for_user()
    AND client_portal_enabled = true
  );

-- ============================================================
-- 4. field_reports
--    • Admins: full access.
--    • Clients: can read published reports for their projects.
-- ============================================================
ALTER TABLE public.field_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "field_reports_admin_all"
  ON public.field_reports FOR ALL
  USING (public.is_admin());

CREATE POLICY "field_reports_client_select"
  ON public.field_reports FOR SELECT
  USING (
    published_to_client = true
    AND project_id IN (
      SELECT id FROM public.projects
      WHERE client_id = public.client_id_for_user()
        AND client_portal_enabled = true
    )
  );

-- ============================================================
-- 5. schedule_items
--    • Admins: full access.
--    • Clients: can read schedule items for their projects.
-- ============================================================
ALTER TABLE public.schedule_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "schedule_items_admin_all"
  ON public.schedule_items FOR ALL
  USING (public.is_admin());

CREATE POLICY "schedule_items_client_select"
  ON public.schedule_items FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM public.projects
      WHERE client_id = public.client_id_for_user()
        AND client_portal_enabled = true
    )
  );

-- ============================================================
-- 6. estimates
--    • Admins: full access.
--    • Clients: can read estimates linked to their client record.
-- ============================================================
ALTER TABLE public.estimates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "estimates_admin_all"
  ON public.estimates FOR ALL
  USING (public.is_admin());

CREATE POLICY "estimates_client_select"
  ON public.estimates FOR SELECT
  USING (client_id = public.client_id_for_user());

-- ============================================================
-- 7. ledger_entries
--    • Admins: full access.
--    • Clients: can read entries marked visible_to_client = true.
-- ============================================================
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ledger_entries_admin_all"
  ON public.ledger_entries FOR ALL
  USING (public.is_admin());

CREATE POLICY "ledger_entries_client_select"
  ON public.ledger_entries FOR SELECT
  USING (
    visible_to_client = true
    AND project_id IN (
      SELECT id FROM public.projects
      WHERE client_id = public.client_id_for_user()
        AND client_portal_enabled = true
    )
  );

-- ============================================================
-- 8. materials
--    • Admins: full access.
--    • Clients: no direct access (materials are internal).
-- ============================================================
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "materials_admin_all"
  ON public.materials FOR ALL
  USING (public.is_admin());

-- ============================================================
-- 9. portfolio_projects
--    • Admins: full access.
--    • Public: can read published items (is_published = true).
-- ============================================================
ALTER TABLE public.portfolio_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "portfolio_admin_all"
  ON public.portfolio_projects FOR ALL
  USING (public.is_admin());

CREATE POLICY "portfolio_public_select"
  ON public.portfolio_projects FOR SELECT
  USING (published = true);

-- ============================================================
-- 10. sub_contractors
--     • Admins: full access.
--     • All others: no access.
-- ============================================================
ALTER TABLE public.sub_contractors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sub_contractors_admin_all"
  ON public.sub_contractors FOR ALL
  USING (public.is_admin());

-- ============================================================
-- 11. finish_selections
--     • Admins: full access.
--     • Clients: read/insert their own selections.
-- ============================================================
ALTER TABLE public.finish_selections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "finish_selections_admin_all"
  ON public.finish_selections FOR ALL
  USING (public.is_admin());

CREATE POLICY "finish_selections_client_select"
  ON public.finish_selections FOR SELECT
  USING (client_id = public.client_id_for_user());

CREATE POLICY "finish_selections_client_insert"
  ON public.finish_selections FOR INSERT
  WITH CHECK (client_id = public.client_id_for_user());

-- ============================================================
-- 12. notifications
--     • Admins: full access.
--     • Recipients: can read/mark-read their own notifications.
-- ============================================================
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_admin_all"
  ON public.notifications FOR ALL
  USING (public.is_admin());

CREATE POLICY "notifications_recipient_select"
  ON public.notifications FOR SELECT
  USING (recipient_id = auth.uid());

CREATE POLICY "notifications_recipient_update"
  ON public.notifications FOR UPDATE
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

-- ============================================================
-- 13. vision_studio_requests
--     • Admins: full access.
--     • Users: can read their own requests.
-- ============================================================
ALTER TABLE public.vision_studio_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vision_requests_admin_all"
  ON public.vision_studio_requests FOR ALL
  USING (public.is_admin());

CREATE POLICY "vision_requests_owner_select"
  ON public.vision_studio_requests FOR SELECT
  USING (user_id = auth.uid());

-- ============================================================
-- 14. billing_events
--     • Admins: full access.
--     • All others: no direct access (webhook-managed only).
-- ============================================================
ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "billing_events_admin_all"
  ON public.billing_events FOR ALL
  USING (public.is_admin());

-- ============================================================
-- Service-role bypass
-- ============================================================
-- Supabase's service-role key automatically bypasses RLS.
-- The server-side Supabase client (db.ts) uses the service-role
-- key and is therefore not affected by these policies.
-- Client-side code uses the anon key and IS subject to RLS.
-- ============================================================

-- ============================================================
-- 15. admin_emails
--     • Admins: full access (defence in depth — the trigger
--       that auto-assigns admin role reads this table, but UI
--       management is admin-only).
--     • All others: no access.
-- ============================================================
ALTER TABLE public.admin_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_emails_admin_all"
  ON public.admin_emails FOR ALL
  USING (public.is_admin());

-- ============================================================
-- 16. profiles
--     • Users: can read/update their own profile.
--     • Admins: full access.
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_admin_all"
  ON public.profiles FOR ALL
  USING (public.is_admin());

CREATE POLICY "profiles_self_select"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "profiles_self_update"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ============================================================
-- 17. site_plans (Excalidraw canvases)
--     • Admins: full access.
--     • Clients: can read plans for their projects.
-- ============================================================
ALTER TABLE public.site_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "site_plans_admin_all"
  ON public.site_plans FOR ALL
  USING (public.is_admin());

CREATE POLICY "site_plans_client_select"
  ON public.site_plans FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM public.projects
      WHERE client_id = public.client_id_for_user()
        AND client_portal_enabled = true
    )
  );

-- ============================================================
-- 18. blueprint_connections (encrypted OAuth tokens)
--     • Users: can read/update their own connection only.
--     • Admins: full access.
-- ============================================================
ALTER TABLE public.blueprint_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "blueprint_connections_admin_all"
  ON public.blueprint_connections FOR ALL
  USING (public.is_admin());

CREATE POLICY "blueprint_connections_self_select"
  ON public.blueprint_connections FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "blueprint_connections_self_update"
  ON public.blueprint_connections FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 19. blueprint_artifacts (linked Blueprint resources)
--     • Admins: full access.
--     • Clients: can read artifacts marked visible_to_client
--       for their projects.
-- ============================================================
ALTER TABLE public.blueprint_artifacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "blueprint_artifacts_admin_all"
  ON public.blueprint_artifacts FOR ALL
  USING (public.is_admin());

CREATE POLICY "blueprint_artifacts_client_select"
  ON public.blueprint_artifacts FOR SELECT
  USING (
    visible_to_client = true
    AND project_id IN (
      SELECT id FROM public.projects
      WHERE client_id = public.client_id_for_user()
        AND client_portal_enabled = true
    )
  );

-- ============================================================
-- 20. purchase_orders
--     • Admins: full access.
--     • All others: no access (internal procurement data).
-- ============================================================
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "purchase_orders_admin_all"
  ON public.purchase_orders FOR ALL
  USING (public.is_admin());

-- ============================================================
-- 21. purchase_order_items
--     • Admins: full access.
--     • All others: no access (internal procurement data).
-- ============================================================
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "purchase_order_items_admin_all"
  ON public.purchase_order_items FOR ALL
  USING (public.is_admin());
