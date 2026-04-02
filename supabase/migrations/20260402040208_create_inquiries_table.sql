create table public.inquiries (
  id           serial primary key,
  name         varchar(200) not null,
  email        varchar(320) not null,
  phone        varchar(30),
  project_type varchar(120),
  budget       varchar(100),
  message      text not null,
  source       varchar(50) default 'contact_form',
  status       varchar(30) default 'new',
  ip_address   varchar(50),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.inquiries enable row level security;

create policy "inquiries_admin" on public.inquiries
  for all using (public.is_admin()) with check (public.is_admin());

create policy "inquiries_service_role" on public.inquiries
  as permissive for all to service_role
  using (true) with check (true);

create policy "inquiries_anon_insert" on public.inquiries
  as permissive for insert to anon
  with check (true);
