-- Adds scheduling/identity fields to employees so bookings/jobs can use a
-- real employee_id foreign key later, employees can be colour-coded on the
-- calendar, and employees can be archived instead of hard-deleted when they
-- have historic job/booking references (spec 5.8).
--
-- Run this once against the project's Postgres database (Supabase SQL
-- Editor, or `supabase db push`).

alter table employees
  add column if not exists user_id uuid,
  add column if not exists colour text,
  add column if not exists specialties text[] not null default '{}',
  add column if not exists default_working_start time,
  add column if not exists default_working_end time,
  add column if not exists archived_at timestamptz;

create index if not exists employees_user_id_idx on employees(user_id) where user_id is not null;
