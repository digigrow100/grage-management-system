-- Transactional convertEstimateToBooking (spec 5.10): locks the estimate,
-- rejects one already booked, creates one booking and one job card, copies
-- every estimate line into job labour/part lines as a snapshot (so a later
-- catalogue price change never rewrites a booked estimate's numbers),
-- reuses compute_booking_window/check_booking_conflict from migration
-- 0019 so the same scheduling rules apply, and sets the estimate's
-- booked_job_id + status atomically. Running the whole thing as one
-- plpgsql function makes it genuinely transactional — a single RPC call
-- either fully succeeds or fully rolls back, so an estimate can't be
-- converted twice even under concurrent requests (the row lock blocks the
-- second caller until the first commits, and it then sees status='booked'
-- and raises).
--
-- Run this once against the project's Postgres database (Supabase SQL
-- Editor, or `supabase db push`). Requires 0019 and 0022 to already be
-- applied.

create or replace function public.convert_estimate_to_booking(
  p_estimate_id uuid,
  p_date date,
  p_time time,
  p_duration_minutes integer,
  p_employee_id uuid default null,
  p_job_type job_type default 'other'
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  est estimates%rowtype;
  window_row record;
  conflict_reason text;
  new_booking_id uuid;
  new_job_id uuid;
  line record;
begin
  select * into est from estimates where id = p_estimate_id for update;

  if not found then
    raise exception 'Estimate not found.';
  end if;
  if not is_garage_member(est.garage_id) then
    raise exception 'Not authorized for this garage.';
  end if;
  if est.status = 'booked' then
    raise exception 'This estimate has already been converted to a booking.';
  end if;
  if est.customer_id is null then
    raise exception 'This estimate has no customer to book.';
  end if;

  select * into window_row from compute_booking_window(est.garage_id, p_date, p_time, p_duration_minutes);

  conflict_reason := check_booking_conflict(est.garage_id, p_employee_id, window_row.starts_at, window_row.ends_at);
  if conflict_reason is not null then
    raise exception '%', conflict_reason;
  end if;

  insert into bookings (
    garage_id, customer_id, vehicle_id, job_type, date, time, duration_minutes,
    starts_at, ends_at, employee_id, estimate_id, notes, est_price, source
  ) values (
    est.garage_id, est.customer_id, est.vehicle_id, p_job_type, p_date, p_time, p_duration_minutes,
    window_row.starts_at, window_row.ends_at, p_employee_id, est.id, est.notes, est.total, 'staff'
  )
  returning id into new_booking_id;

  insert into job_cards (
    garage_id, booking_id, customer_id, vehicle_id, status, priority,
    description, due_date, notes, estimate_id
  ) values (
    est.garage_id, new_booking_id, est.customer_id, est.vehicle_id, 'booked', 'medium',
    coalesce('From estimate ' || est.estimate_number, 'From estimate'), p_date, est.notes, est.id
  )
  returning id into new_job_id;

  for line in select * from estimate_lines where estimate_id = est.id order by sort_order loop
    if line.line_type = 'labour' then
      insert into job_labour_lines (garage_id, job_id, description, hours, rate)
      values (est.garage_id, new_job_id, line.description, line.quantity, line.unit_price);
    else
      insert into job_part_lines (garage_id, job_id, description, quantity, unit_price)
      values (est.garage_id, new_job_id, line.description, line.quantity, line.unit_price);
    end if;
  end loop;

  update estimates
  set status = 'booked', booked_job_id = new_job_id, updated_at = now()
  where id = est.id;

  return new_job_id;
end;
$$;

grant execute on function public.convert_estimate_to_booking(uuid, date, time, integer, uuid, job_type) to authenticated;
