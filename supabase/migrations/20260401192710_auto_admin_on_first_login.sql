-- Trigger: auto-upsert user profile row on auth sign-in
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _role user_role;
begin
  -- First user or known admin email gets admin role
  select case
    when exists (select 1 from public.admin_emails where email = new.email)
      then 'admin'::user_role
    when not exists (select 1 from public.users)
      then 'admin'::user_role
    else 'user'::user_role
  end into _role;

  insert into public.users (id, email, name, role, last_signed_in)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    _role,
    now()
  )
  on conflict (id) do update
    set last_signed_in = now(),
        email = excluded.email;

  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
