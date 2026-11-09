-- Apply once the app reads the staff directory through list_garage_employees.
revoke select on public.employees from public, anon, authenticated;
revoke select (email, phone, hourly_rate) on public.employees from public, anon, authenticated;
grant select (
  id, garage_id, user_id, full_name, role, active, colour, created_at,
  updated_at, archived_at, specialties, default_working_start, default_working_end
) on public.employees to authenticated;
