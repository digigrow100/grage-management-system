-- New, fully independent tables for garage opening hours (one row per
-- weekday per garage) and one-off closures/bank holidays. Neither touches
-- any existing table, so this is safe alongside live data.
--
-- Run this once against the project's Postgres database (Supabase SQL
-- Editor, or `supabase db push`).

create table if not exists garage_opening_hours (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid not null references garage_settings(id) on delete cascade,
  weekday smallint not null,
  is_closed boolean not null default false,
  is_24_hours boolean not null default false,
  opens_at time,
  closes_at time,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint garage_opening_hours_weekday_check check (weekday >= 0 and weekday <= 6),
  constraint garage_opening_hours_garage_weekday_key unique (garage_id, weekday)
);

alter table garage_opening_hours enable row level security;

drop policy if exists "garage_opening_hours_select" on garage_opening_hours;
create policy "garage_opening_hours_select" on garage_opening_hours
  for select to authenticated using (is_garage_member(garage_id));

drop policy if exists "garage_opening_hours_insert" on garage_opening_hours;
create policy "garage_opening_hours_insert" on garage_opening_hours
  for insert to authenticated with check (is_garage_member(garage_id));

drop policy if exists "garage_opening_hours_update" on garage_opening_hours;
create policy "garage_opening_hours_update" on garage_opening_hours
  for update to authenticated using (is_garage_member(garage_id)) with check (is_garage_member(garage_id));

drop policy if exists "garage_opening_hours_delete" on garage_opening_hours;
create policy "garage_opening_hours_delete" on garage_opening_hours
  for delete to authenticated using (is_garage_member(garage_id));

create index if not exists garage_opening_hours_garage_id_idx on garage_opening_hours(garage_id);

create table if not exists garage_closures (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid not null references garage_settings(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  title text,
  closure_type text not null default 'custom',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint garage_closures_ends_after_starts_check check (ends_at > starts_at)
);

alter table garage_closures enable row level security;

drop policy if exists "garage_closures_select" on garage_closures;
create policy "garage_closures_select" on garage_closures
  for select to authenticated using (is_garage_member(garage_id));

drop policy if exists "garage_closures_insert" on garage_closures;
create policy "garage_closures_insert" on garage_closures
  for insert to authenticated with check (is_garage_member(garage_id));

drop policy if exists "garage_closures_update" on garage_closures;
create policy "garage_closures_update" on garage_closures
  for update to authenticated using (is_garage_member(garage_id)) with check (is_garage_member(garage_id));

drop policy if exists "garage_closures_delete" on garage_closures;
create policy "garage_closures_delete" on garage_closures
  for delete to authenticated using (is_garage_member(garage_id));

create index if not exists garage_closures_garage_id_idx on garage_closures(garage_id, starts_at);

-- Prevent duplicate imported bank holidays / manual closures with the same
-- garage, window and title.
create unique index if not exists garage_closures_dedupe_idx
  on garage_closures(garage_id, starts_at, ends_at, coalesce(title, ''));
