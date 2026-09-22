-- Adds DVLA Vehicle Enquiry Service fields to vehicles, plus a normalized
-- registration column used for lookup/search/dedupe (spec 5.5). The raw
-- dvla_response jsonb is server-read-only in application code — it is not
-- selected by any client-exposed query going forward, but historic direct
-- table access via RLS is still garage-member-only, matching every other
-- tenant table.
--
-- Run this once against the project's Postgres database (Supabase SQL
-- Editor, or `supabase db push`).

alter table vehicles
  add column if not exists registration_normalized text,
  add column if not exists vin text,
  add column if not exists fuel_type text,
  add column if not exists engine_capacity_cc integer,
  add column if not exists co2_emissions integer,
  add column if not exists tax_status text,
  add column if not exists tax_due_date date,
  add column if not exists mot_status text,
  add column if not exists month_of_first_registration text,
  add column if not exists date_of_last_v5c_issued date,
  add column if not exists type_approval text,
  add column if not exists wheelplan text,
  add column if not exists euro_status text,
  add column if not exists marked_for_export boolean,
  add column if not exists dvla_last_checked_at timestamptz,
  add column if not exists dvla_response jsonb;

update vehicles
set registration_normalized = upper(replace(registration, ' ', ''))
where registration_normalized is null;

create unique index if not exists vehicles_garage_registration_normalized_key
  on vehicles(garage_id, registration_normalized);

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

drop trigger if exists trg_normalize_vehicle_registration on vehicles;
create trigger trg_normalize_vehicle_registration
  before insert or update of registration on vehicles
  for each row execute function public.normalize_vehicle_registration();
