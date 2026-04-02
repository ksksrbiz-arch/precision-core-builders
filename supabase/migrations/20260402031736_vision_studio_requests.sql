create table public.vision_studio_requests (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references auth.users(id) on delete set null,
  project_id          int references public.projects(id) on delete set null,
  mode                varchar(20) not null default 'general',
  custom_prompt       text,
  analysis            text not null,
  model               varchar(50) not null,
  prompt_tokens       int not null default 0,
  completion_tokens   int not null default 0,
  total_tokens        int not null default 0,
  image_storage_path  text,
  created_at          timestamptz not null default now()
);

alter table public.vision_studio_requests enable row level security;

create policy "vision_admin" on public.vision_studio_requests
  for all using (public.is_admin()) with check (public.is_admin());

create policy "vision_own" on public.vision_studio_requests
  for select using (user_id = auth.uid());
