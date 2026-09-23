-- Phase 4: Employee leave management. Purely additive/greenfield — no
-- existing leave/holiday/absence table anywhere in the schema (confirmed
-- via grep across all prior migrations). Mirrors the RLS shape already
-- used by employee_working_hours (0015): garage-scoped via
-- is_garage_member(), with the finer-grained "who can approve vs. who can
-- only manage their own request" distinction left to the application
-- layer (mutations.ts), same as every other permission in this codebase.
--
-- Deliberately does NOT touch check_booking_conflict() — that function
-- was already scoped to skip employee_working_hours consultation (a
-- pre-existing gap noted in 0015's own comment), and wiring approved
-- leave into booking-conflict checks is a natural follow-up once that
-- larger gap is addressed, not part of this first slice.

create table if not exists employee_leave (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid not null references garage_settings(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  leave_type text not null default 'annual',
  starts_on date not null,
  ends_on date not null,
  status text not null default 'requested',
  notes text,
  requested_by uuid,
  approved_by uuid,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint employee_leave_type_check check (leave_type in ('annual', 'sick', 'unpaid', 'other')),
  constraint employee_leave_status_check check (status in ('requested', 'approved', 'rejected', 'cancelled')),
  constraint employee_leave_dates_check check (ends_on >= starts_on)
);

alter table employee_leave enable row level security;

drop policy if exists "employee_leave_select" on employee_leave;
create policy "employee_leave_select" on employee_leave for select to authenticated using (is_garage_member(garage_id));
drop policy if exists "employee_leave_insert" on employee_leave;
create policy "employee_leave_insert" on employee_leave for insert to authenticated with check (is_garage_member(garage_id));
drop policy if exists "employee_leave_update" on employee_leave;
create policy "employee_leave_update" on employee_leave for update to authenticated using (is_garage_member(garage_id)) with check (is_garage_member(garage_id));
drop policy if exists "employee_leave_delete" on employee_leave;
create policy "employee_leave_delete" on employee_leave for delete to authenticated using (is_garage_member(garage_id));

create index if not exists employee_leave_garage_status_idx on employee_leave(garage_id, status, starts_on);
create index if not exists employee_leave_employee_idx on employee_leave(employee_id, starts_on);
