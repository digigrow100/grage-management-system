-- Second half of the jobs upgrade — must run after 0020 commits (see that
-- file's header). Migrates any historic 'invoiced' job_cards rows to
-- 'completed', adds the new job_cards columns, and creates
-- job_status_history.
--
-- Run this once against the project's Postgres database (Supabase SQL
-- Editor, or `supabase db push`).

update job_cards set status = 'completed' where status = 'invoiced';

alter table job_cards
  add column if not exists job_number text,
  add column if not exists employee_id uuid references employees(id) on delete set null,
  add column if not exists estimate_id uuid,
  add column if not exists checked_in_at timestamptz,
  add column if not exists started_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists released_at timestamptz,
  add column if not exists authorization_status text not null default 'not_required',
  add column if not exists mileage_in integer,
  add column if not exists customer_complaint text,
  add column if not exists internal_notes text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'job_cards_authorization_status_check') then
    alter table job_cards
      add constraint job_cards_authorization_status_check
      check (authorization_status in ('not_required', 'awaiting', 'authorised', 'declined'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'job_cards_mileage_in_check') then
    alter table job_cards
      add constraint job_cards_mileage_in_check
      check (mileage_in is null or mileage_in >= 0);
  end if;
end $$;

create index if not exists job_cards_status_updated_idx on job_cards(garage_id, status, updated_at desc);
create index if not exists job_cards_employee_status_idx on job_cards(garage_id, employee_id, status);

create table if not exists job_status_history (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid not null references garage_settings(id) on delete cascade,
  job_id uuid not null references job_cards(id) on delete cascade,
  previous_status text,
  new_status text not null,
  reason text,
  changed_by uuid,
  created_at timestamptz not null default now()
);

alter table job_status_history enable row level security;

drop policy if exists "job_status_history_select" on job_status_history;
create policy "job_status_history_select" on job_status_history
  for select to authenticated using (is_garage_member(garage_id));

drop policy if exists "job_status_history_insert" on job_status_history;
create policy "job_status_history_insert" on job_status_history
  for insert to authenticated with check (is_garage_member(garage_id));

create index if not exists job_status_history_job_id_idx on job_status_history(job_id, created_at desc);
