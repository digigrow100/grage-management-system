-- Hotfix: check_booking_conflict (migration 0019) declared a local
-- variable named `weekday`, same as garage_opening_hours.weekday. Postgres
-- treats `garage_opening_hours.weekday = weekday` as ambiguous even with
-- one side qualified, because the bare `weekday` on the right could bind
-- to either the column (via the table in scope) or the plpgsql variable —
-- and raises a hard error, not a silent wrong-answer. This broke every
-- call to check_booking_conflict (and therefore addBooking, and the new
-- convert_estimate_to_booking), confirmed via a live functional test
-- before writing this fix. Renaming the variable to v_weekday removes the
-- ambiguity; behavior is otherwise unchanged.
--
-- Run this once against the project's Postgres database (Supabase SQL
-- Editor, or `supabase db push`).

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
  v_weekday smallint;
  local_start time;
  local_end time;
  allow_overlap boolean;
  hours_row garage_opening_hours%rowtype;
  conflict_count integer;
begin
  select coalesce(timezone, 'Europe/London'), coalesce(allow_overlapping_jobs, false)
    into tz, allow_overlap
    from garage_settings where id = p_garage_id;

  select count(*) into conflict_count
  from garage_closures
  where garage_id = p_garage_id
    and starts_at < p_ends_at
    and ends_at > p_starts_at;
  if conflict_count > 0 then
    return 'The garage is closed for part of this time.';
  end if;

  v_weekday := extract(dow from (p_starts_at at time zone coalesce(tz, 'Europe/London')));
  select * into hours_row
  from garage_opening_hours
  where garage_id = p_garage_id and garage_opening_hours.weekday = v_weekday;

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
