-- Extends bookings with real start/end timestamps, a booking-level status,
-- a real employee_id FK (replacing free-text-only technician for
-- scheduling purposes — technician text column is kept for backward
-- compatible display), off-site location fields, and cancellation
-- tracking (spec 5.9).
--
-- starts_at/ends_at are backfilled from the existing date/time/
-- duration_minutes columns, interpreted in the owning garage's timezone
-- (garage_settings.timezone, added in migration 0008). Missing time
-- defaults to 09:00, missing duration defaults to 60 minutes — both are
-- display-only defaults for historic rows; new bookings always supply
-- both explicitly.
--
-- Run this once against the project's Postgres database (Supabase SQL
-- Editor, or `supabase db push`).

alter table bookings
  add column if not exists starts_at timestamptz,
  add column if not exists ends_at timestamptz,
  add column if not exists status text not null default 'confirmed',
  add column if not exists employee_id uuid references employees(id) on delete set null,
  add column if not exists service_id uuid references service_catalogue(id) on delete set null,
  add column if not exists estimate_id uuid,
  add column if not exists location_type text not null default 'garage',
  add column if not exists address_line text,
  add column if not exists post_code text,
  add column if not exists google_place_id text,
  add column if not exists latitude numeric(10,7),
  add column if not exists longitude numeric(10,7),
  add column if not exists source text not null default 'staff',
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancellation_reason text,
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'bookings_status_check') then
    alter table bookings
      add constraint bookings_status_check
      check (status in ('confirmed', 'checked_in', 'completed', 'cancelled', 'no_show'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'bookings_location_type_check') then
    alter table bookings
      add constraint bookings_location_type_check
      check (location_type in ('garage', 'customer_address', 'other'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'bookings_ends_after_starts_check') then
    alter table bookings
      add constraint bookings_ends_after_starts_check
      check (ends_at is null or starts_at is null or ends_at > starts_at);
  end if;
end $$;

update bookings b
set
  starts_at = (b.date::text || ' ' || coalesce(b.time::text, '09:00:00'))::timestamp
    at time zone coalesce(g.timezone, 'Europe/London'),
  ends_at = (
    (b.date::text || ' ' || coalesce(b.time::text, '09:00:00'))::timestamp
    at time zone coalesce(g.timezone, 'Europe/London')
  ) + make_interval(mins => coalesce(b.duration_minutes, 60))
from garage_settings g
where b.garage_id = g.id
  and b.starts_at is null;

create index if not exists bookings_starts_ends_idx on bookings(garage_id, starts_at, ends_at);
create index if not exists bookings_employee_starts_idx on bookings(garage_id, employee_id, starts_at);
