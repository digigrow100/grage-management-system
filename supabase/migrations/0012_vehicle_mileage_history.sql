-- Records every mileage reading against a vehicle over time so updating
-- vehicles.mileage never loses history (spec 5.6). New, independent table.
--
-- Run this once against the project's Postgres database (Supabase SQL
-- Editor, or `supabase db push`).

create table if not exists vehicle_mileage_history (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid not null references garage_settings(id) on delete cascade,
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  job_id uuid references job_cards(id) on delete set null,
  mileage integer not null,
  recorded_at timestamptz not null default now(),
  recorded_by uuid,
  constraint vehicle_mileage_history_mileage_check check (mileage >= 0)
);

alter table vehicle_mileage_history enable row level security;

drop policy if exists "vehicle_mileage_history_select" on vehicle_mileage_history;
create policy "vehicle_mileage_history_select" on vehicle_mileage_history
  for select to authenticated using (is_garage_member(garage_id));

drop policy if exists "vehicle_mileage_history_insert" on vehicle_mileage_history;
create policy "vehicle_mileage_history_insert" on vehicle_mileage_history
  for insert to authenticated with check (is_garage_member(garage_id));

create index if not exists vehicle_mileage_history_vehicle_id_idx
  on vehicle_mileage_history(vehicle_id, recorded_at desc);
create index if not exists vehicle_mileage_history_garage_id_idx
  on vehicle_mileage_history(garage_id);

-- Backfill one opening reading per vehicle that already has a mileage value,
-- so history is never empty for vehicles created before this migration.
insert into vehicle_mileage_history (garage_id, vehicle_id, mileage, recorded_at)
select garage_id, id, mileage, coalesce(updated_at, created_at)
from vehicles
where mileage is not null
on conflict do nothing;
