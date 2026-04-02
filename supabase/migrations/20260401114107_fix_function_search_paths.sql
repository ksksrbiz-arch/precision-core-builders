-- Ensure all functions have explicit search_path to prevent privilege escalation
alter function public.is_admin() set search_path = public;
