-- Per-employee weekly working hours, used by calendar availability once
-- booking conflict checking is built in Phase 2 (spec 5.8).
--
-- Run this once against the project's Postgres database (Supabase SQL
-- Editor, or `supabase db push`).

create table if not exists employee_working_hours (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid not null references garage_settings(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  weekday smallint not null,
  is_working boolean not null default true,
  starts_at time,
  ends_at time,
  constraint employee_working_hours_weekday_check check (weekday >= 0 and weekday <= 6),
  constraint employee_working_hours_employee_weekday_key unique (employee_id, weekday)
);

alter table employee_working_hours enable row level security;

drop policy if exists "employee_working_hours_select" on employee_working_hours;
create policy "employee_working_hours_select" on employee_working_hours
  for select to authenticated using (is_garage_member(garage_id));

drop policy if exists "employee_working_hours_insert" on employee_working_hours;
create policy "employee_working_hours_insert" on employee_working_hours
  for insert to authenticated with check (is_garage_member(garage_id));

drop policy if exists "employee_working_hours_update" on employee_working_hours;
create policy "employee_working_hours_update" on employee_working_hours
  for update to authenticated using (is_garage_member(garage_id)) with check (is_garage_member(garage_id));

drop policy if exists "employee_working_hours_delete" on employee_working_hours;
create policy "employee_working_hours_delete" on employee_working_hours
  for delete to authenticated using (is_garage_member(garage_id));

create index if not exists employee_working_hours_garage_id_idx on employee_working_hours(garage_id);
