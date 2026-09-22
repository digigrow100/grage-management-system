-- Server-side helpers for booking scheduling (spec 5.9, acceptance tests
-- 7 and 8: closed times/working hours prevent invalid bookings, and the
-- overlap setting is respected on the server including concurrent
-- requests).
--
-- compute_booking_window() converts a garage-local date/time/duration into
-- real UTC instants using the garage's stored IANA timezone, so bookings
-- created via the app use the exact same conversion as the historic
-- backfill in migration 0018 — no drift between old and new rows.
--
-- check_booking_conflict() is called by the same transaction as the
-- booking insert (via the app's addBooking action) and returns a human
-- readable reason or null. It checks, in order: garage closures, garage
-- opening hours (only enforced when a row exists for that weekday — a
-- garage that hasn't configured hours yet isn't blocked), and — unless
-- garage_settings.allow_overlapping_jobs is true — another active booking
-- for the same employee whose window overlaps. SECURITY INVOKER (the
-- default) is correct here: both functions only read data the caller's own
-- RLS policies already allow them to see.
--
-- Run this once against the project's Postgres database (Supabase SQL
-- Editor, or `supabase db push`).

create or replace function public.compute_booking_window(
  p_garage_id uuid,
  p_date date,
  p_time time,
  p_duration_minutes integer,
  out starts_at timestamptz,
  out ends_at timestamptz
)
language plpgsql
stable
set search_path = public
as $$
declare
  tz text;
  local_start timestamp;
begin
  select coalesce(timezone, 'Europe/London') into tz
  from garage_settings where id = p_garage_id;

  local_start := (p_date::text || ' ' || coalesce(p_time::text, '09:00:00'))::timestamp;
  starts_at := local_start at time zone coalesce(tz, 'Europe/London');
  ends_at := starts_at + make_interval(mins => coalesce(p_duration_minutes, 60));
end;
$$;

grant execute on function public.compute_booking_window(uuid, date, time, integer) to authenticated;

create or replace function public.check_booking_conflict(
  p_garage_id uuid,
  p_employee_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_exclude_booking_id uuid default null
)
returns text
language plpgsql
stable
set search_path = public
as $$
declare
  tz text;
  weekday smallint;
  local_start time;
  local_end time;
  allow_overlap boolean;
  hours_row garage_opening_hours%rowtype;
  conflict_count integer;
begin
  select coalesce(timezone, 'Europe/London'), coalesce(allow_overlapping_jobs, false)
    into tz, allow_overlap
    from garage_settings where id = p_garage_id;

  -- Garage closures (bank holidays, custom closures) always block,
  -- regardless of the overlap setting.
  select count(*) into conflict_count
  from garage_closures
  where garage_id = p_garage_id
    and starts_at < p_ends_at
    and ends_at > p_starts_at;
  if conflict_count > 0 then
    return 'The garage is closed for part of this time.';
  end if;

  -- Opening hours: only enforced once the garage has configured them for
  -- that weekday. weekday: 0 = Sunday .. 6 = Saturday, matching JS Date.
  weekday := extract(dow from (p_starts_at at time zone coalesce(tz, 'Europe/London')));
  select * into hours_row
  from garage_opening_hours
  where garage_id = p_garage_id and garage_opening_hours.weekday = weekday;

  if found then
    if hours_row.is_closed then
      return 'The garage is closed on this day.';
    end if;
    if not hours_row.is_24_hours then
      local_start := (p_starts_at at time zone coalesce(tz, 'Europe/London'))::time;
      local_end := (p_ends_at at time zone coalesce(tz, 'Europe/London'))::time;
      if hours_row.opens_at is not null and local_start < hours_row.opens_at then
        return 'This time is before the garage opens.';
      end if;
      if hours_row.closes_at is not null and local_end > hours_row.closes_at then
        return 'This time is after the garage closes.';
      end if;
    end if;
  end if;

  -- Double-booking the same technician, unless overlaps are explicitly
  -- allowed for this garage.
  if p_employee_id is not null and not allow_overlap then
    select count(*) into conflict_count
    from bookings
    where garage_id = p_garage_id
      and employee_id = p_employee_id
      and status not in ('cancelled', 'no_show')
      and starts_at is not null and ends_at is not null
      and starts_at < p_ends_at
      and ends_at > p_starts_at
      and (p_exclude_booking_id is null or id <> p_exclude_booking_id);
    if conflict_count > 0 then
      return 'This technician already has a booking that overlaps this time.';
    end if;
  end if;

  return null;
end;
$$;

grant execute on function public.check_booking_conflict(uuid, uuid, timestamptz, timestamptz, uuid) to authenticated;
