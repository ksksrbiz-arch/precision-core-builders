create table public.leads (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  name             text not null,
  email            text not null,
  phone            text,
  project_type     text,
  budget           text,
  message          text not null,
  score            int,
  priority         text check (priority in ('low','medium','high','urgent')),
  reasoning        text,
  suggested_action text,
  estimated_value  numeric,
  status           text not null default 'new' check (status in ('new','contacted','qualified','closed'))
);

alter table public.leads enable row level security;

create policy "leads_service_role" on public.leads
  as permissive for all to service_role
  using (true) with check (true);

create policy "leads_admin" on public.leads
  for all using (public.is_admin()) with check (public.is_admin());

create policy "leads_anon_insert" on public.leads
  as permissive for insert to anon
  with check (true);
