-- Enable RLS on all tables
alter table public.users enable row level security;
alter table public.admin_emails enable row level security;
alter table public.clients enable row level security;
alter table public.projects enable row level security;
alter table public.estimates enable row level security;
alter table public.field_reports enable row level security;
alter table public.schedule_items enable row level security;
alter table public.materials enable row level security;
alter table public.ledger_entries enable row level security;
alter table public.finish_selections enable row level security;
alter table public.notifications enable row level security;
alter table public.portfolio_projects enable row level security;
alter table public.sub_contractors enable row level security;

-- Helper: is the caller an admin?
create or replace function public.is_admin()
returns boolean
language sql stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role = 'admin'
  );
$$;

-- users: anyone can read their own row; admins read all
create policy "users_self_read"   on public.users for select using (id = auth.uid() or public.is_admin());
create policy "users_self_update" on public.users for update using (id = auth.uid()) with check (id = auth.uid());
create policy "users_admin_all"   on public.users for all using (public.is_admin()) with check (public.is_admin());

-- admin_emails: admins only
create policy "admin_emails_admin" on public.admin_emails for all using (public.is_admin()) with check (public.is_admin());

-- clients: admins full access; clients see own record
create policy "clients_admin"  on public.clients for all using (public.is_admin()) with check (public.is_admin());
create policy "clients_self"   on public.clients for select using (user_id = auth.uid());

-- projects: admins full; clients see their own
create policy "projects_admin" on public.projects for all using (public.is_admin()) with check (public.is_admin());
create policy "projects_client" on public.projects for select
  using (client_portal_enabled = true and client_id in (select id from public.clients where user_id = auth.uid()));

-- estimates: admins only (sensitive pricing)
create policy "estimates_admin" on public.estimates for all using (public.is_admin()) with check (public.is_admin());

-- field_reports: admins full; clients see published reports for their projects
create policy "field_reports_admin"  on public.field_reports for all using (public.is_admin()) with check (public.is_admin());
create policy "field_reports_client" on public.field_reports for select
  using (published_to_client = true and project_id in (
    select p.id from public.projects p
    join public.clients c on c.id = p.client_id
    where c.user_id = auth.uid() and p.client_portal_enabled = true
  ));

-- schedule_items: admins full; clients see their project tasks
create policy "schedule_admin"  on public.schedule_items for all using (public.is_admin()) with check (public.is_admin());
create policy "schedule_client" on public.schedule_items for select
  using (project_id in (
    select p.id from public.projects p
    join public.clients c on c.id = p.client_id
    where c.user_id = auth.uid() and p.client_portal_enabled = true
  ));

-- materials: admins only
create policy "materials_admin" on public.materials for all using (public.is_admin()) with check (public.is_admin());

-- ledger_entries: admins full; clients see visible entries for their projects
create policy "ledger_admin"  on public.ledger_entries for all using (public.is_admin()) with check (public.is_admin());
create policy "ledger_client" on public.ledger_entries for select
  using (visible_to_client = true and project_id in (
    select p.id from public.projects p
    join public.clients c on c.id = p.client_id
    where c.user_id = auth.uid() and p.client_portal_enabled = true
  ));

-- finish_selections: admins full; clients see their own
create policy "finishes_admin"  on public.finish_selections for all using (public.is_admin()) with check (public.is_admin());
create policy "finishes_client" on public.finish_selections for select
  using (project_id in (
    select p.id from public.projects p
    join public.clients c on c.id = p.client_id
    where c.user_id = auth.uid() and p.client_portal_enabled = true
  ));

-- notifications: admins full; recipients see own
create policy "notifications_admin"     on public.notifications for all using (public.is_admin()) with check (public.is_admin());
create policy "notifications_recipient" on public.notifications for select using (recipient_id = auth.uid());
create policy "notifications_read"      on public.notifications for update using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());

-- portfolio_projects: anyone reads published; admins manage all
create policy "portfolio_public"  on public.portfolio_projects for select using (published = true);
create policy "portfolio_admin"   on public.portfolio_projects for all using (public.is_admin()) with check (public.is_admin());

-- sub_contractors: admins only
create policy "subcon_admin" on public.sub_contractors for all using (public.is_admin()) with check (public.is_admin());
