-- Creates the shared service catalogue used by bookings/estimates/jobs
-- (spec 5.7). Seeds each existing garage with one row per current job_type
-- enum value so the catalogue starts populated with what the app already
-- offers, without duplicating rows if this migration is re-run.
--
-- Run this once against the project's Postgres database (Supabase SQL
-- Editor, or `supabase db push`).

create table if not exists service_catalogue (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid not null references garage_settings(id) on delete cascade,
  name text not null,
  description text,
  category text,
  default_duration_minutes integer not null default 60,
  default_labour_price numeric(12,2),
  vat_rate numeric(5,2),
  active boolean not null default true,
  job_type_seed text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint service_catalogue_duration_check check (default_duration_minutes > 0),
  constraint service_catalogue_labour_price_check check (default_labour_price is null or default_labour_price >= 0)
);

alter table service_catalogue enable row level security;

drop policy if exists "service_catalogue_select" on service_catalogue;
create policy "service_catalogue_select" on service_catalogue
  for select to authenticated using (is_garage_member(garage_id));

drop policy if exists "service_catalogue_insert" on service_catalogue;
create policy "service_catalogue_insert" on service_catalogue
  for insert to authenticated with check (is_garage_member(garage_id));

drop policy if exists "service_catalogue_update" on service_catalogue;
create policy "service_catalogue_update" on service_catalogue
  for update to authenticated using (is_garage_member(garage_id)) with check (is_garage_member(garage_id));

drop policy if exists "service_catalogue_delete" on service_catalogue;
create policy "service_catalogue_delete" on service_catalogue
  for delete to authenticated using (is_garage_member(garage_id));

create index if not exists service_catalogue_garage_id_idx on service_catalogue(garage_id, active, category);

-- One row per garage per job_type seed, never duplicated.
create unique index if not exists service_catalogue_garage_seed_key
  on service_catalogue(garage_id, job_type_seed) where job_type_seed is not null;

insert into service_catalogue (garage_id, name, job_type_seed, default_duration_minutes)
select g.id, seed.label, seed.value, 60
from garage_settings g
cross join (values
  ('vehicle_recovery', 'Vehicle Recovery'),
  ('diagnostic', 'Diagnostic'),
  ('oil_service', 'Oil Service'),
  ('full_service', 'Full Service'),
  ('mot', 'MOT'),
  ('tyre_replacement', 'Tyre Replacement'),
  ('vehicle_storage', 'Vehicle Storage'),
  ('mobile_tyre_fitting', 'Mobile Tyre Fitting'),
  ('battery_replacement', 'Battery Replacement'),
  ('other', 'Other')
) as seed(value, label)
on conflict (garage_id, job_type_seed) where job_type_seed is not null do nothing;
