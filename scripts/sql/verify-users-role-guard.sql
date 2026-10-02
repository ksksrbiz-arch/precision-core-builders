-- Verifies migration 0013 (users role guard) against a live database WITHOUT
-- leaving anything behind: every step runs inside one DO block that ends by
-- raising an exception, so the whole transaction rolls back. Read the result in
-- the error text ("PROBE_REPORT: ..."). Expected:
--   a) self-promote: BLOCKED; a2) own non-role update rows=1;
--   b1) unconfirmed pre-approved role=user; b2) after confirming role=admin;
--   c) confirmed pre-approved role=admin; d) admin changes another role rows=1
-- If a) says NOT BLOCKED, any signed-in user can make themselves admin.
-- (Run it in the Supabase SQL editor. Avoid DROP TRIGGER + CREATE TRIGGER in one
-- request through the MCP connector — it stalls; use CREATE OR REPLACE TRIGGER.)
do $probe$
declare
  uid uuid := gen_random_uuid(); uid2 uuid := gen_random_uuid(); uid3 uuid := gen_random_uuid();
  report text := ''; r text; t0 timestamptz := clock_timestamp();
begin
  set local lock_timeout = '5s';
  set local statement_timeout = '30s';

  insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, created_at, updated_at)
  values (uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'probe-a-' || uid || '@example.invalid', now(), now(), now());
  perform set_config('request.jwt.claim.sub', uid::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    update public.users set role = 'admin' where id = uid;
    report := report || 'a) self-promote: NOT BLOCKED; ';
  exception when insufficient_privilege then
    report := report || 'a) self-promote: BLOCKED; ';
  end;
  update public.users set name = 'Probe' where id = uid;
  get diagnostics r = row_count;
  report := report || 'a2) own non-role update rows=' || r || '; ';
  reset role;

  insert into public.admin_emails (email) values ('probe-b-' || uid2 || '@example.invalid');
  insert into auth.users (id, instance_id, aud, role, email, created_at, updated_at)
  values (uid2, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'probe-b-' || uid2 || '@example.invalid', now(), now());
  select role::text into r from public.users where id = uid2;
  report := report || 'b1) unconfirmed pre-approved role=' || coalesce(r,'<none>') || '; ';
  update auth.users set email_confirmed_at = now() where id = uid2;
  select role::text into r from public.users where id = uid2;
  report := report || 'b2) after confirming role=' || coalesce(r,'<none>') || '; ';

  insert into public.admin_emails (email) values ('probe-c-' || uid3 || '@example.invalid');
  insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, created_at, updated_at)
  values (uid3, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'probe-c-' || uid3 || '@example.invalid', now(), now(), now());
  select role::text into r from public.users where id = uid3;
  report := report || 'c) confirmed pre-approved role=' || coalesce(r,'<none>') || '; ';

  perform set_config('request.jwt.claim.sub', uid3::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid3, 'role', 'authenticated')::text, true);
  set local role authenticated;
  update public.users set role = 'admin' where id = uid;
  get diagnostics r = row_count;
  report := report || 'd) admin changes another role rows=' || r || '; ';
  reset role;

  raise exception 'PROBE_REPORT: % total %', report, (clock_timestamp() - t0);
end
$probe$;