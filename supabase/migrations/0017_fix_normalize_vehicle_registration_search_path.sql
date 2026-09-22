-- Pins search_path on the trigger function added in
-- 0011_vehicles_dvla_fields.sql, per the Supabase security linter
-- (function_search_path_mutable). No behaviour change.
--
-- Run this once against the project's Postgres database (Supabase SQL
-- Editor, or `supabase db push`).

create or replace function public.normalize_vehicle_registration()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.registration_normalized := upper(replace(new.registration, ' ', ''));
  return new;
end;
$$;
