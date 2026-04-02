-- Grant anon role explicit table access so the new sb_publishable_* key works.
-- The publishable key maps to the anon role, same as the legacy anon JWT.

grant usage on schema public to anon;

grant select  on public.portfolio_projects   to anon;
grant insert  on public.leads                to anon;
grant insert  on public.inquiries            to anon;

-- authenticated (portal users)
grant usage on schema public to authenticated;
grant select, insert, update on public.users              to authenticated;
grant select                  on public.projects          to authenticated;
grant select                  on public.clients           to authenticated;
grant select                  on public.field_reports     to authenticated;
grant select                  on public.schedule_items    to authenticated;
grant select                  on public.ledger_entries    to authenticated;
grant select                  on public.finish_selections to authenticated;
grant select, insert, update  on public.notifications     to authenticated;
grant select                  on public.portfolio_projects to authenticated;
grant insert, select          on public.vision_studio_requests to authenticated;
