-- Public booking-request widget.
--
-- Adds a per-garage public link (garage_settings.booking_widget_token) that
-- an unauthenticated visitor can use to submit a booking request without
-- logging in. Requests land in a new booking_requests table for staff to
-- review and accept (converting into a real booking) or decline.
--
-- Follows the same no-anon-RLS pattern as feedback_requests (0028) and
-- vehicle_history_links (0031): the underlying tables carry no anon
-- policies at all. All public access goes through SECURITY DEFINER
-- functions that validate the token themselves and never return garage_id
-- or other tenant-internal data.
--
-- Purely additive. Run once against the project's Postgres database.

-- 1. Per-garage public widget link ------------------------------------------

alter table garage_settings
  add column if not exists booking_widget_token text,
  add column if not exists booking_widget_enabled boolean not null default true;

update garage_settings
set booking_widget_token = replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
where booking_widget_token is null;

alter table garage_settings alter column booking_widget_token set not null;
alter table garage_settings alter column booking_widget_token set default
  (replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''));

create unique index if not exists garage_settings_booking_widget_token_key
  on garage_settings (booking_widget_token);

-- 2. booking_requests ---------------------------------------------------------

create table if not exists booking_requests (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid not null references garage_settings(id) on delete cascade,
  customer_name text not null,
  customer_email text,
  customer_phone text,
  vehicle_registration text,
  vehicle_make text,
  vehicle_model text,
  job_type text not null,
  preferred_date date,
  preferred_time time,
  notes text,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'converted')),
  decided_at timestamptz,
  decided_by uuid references auth.users(id) on delete set null,
  decline_reason text,
  booking_id uuid references bookings(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists booking_requests_garage_id_idx on booking_requests(garage_id);
create index if not exists booking_requests_status_idx on booking_requests(garage_id, status);

alter table booking_requests enable row level security;

-- Staff (garage members) can read and update their garage's requests.
-- No insert/delete policy for anyone, and no anon policy at all — creation
-- happens exclusively through create_booking_request() below.
create policy "booking_requests_select" on booking_requests
  for select to authenticated using (is_garage_member(garage_id));

create policy "booking_requests_update" on booking_requests
  for update to authenticated using (is_garage_member(garage_id)) with check (is_garage_member(garage_id));

-- 3. Public: look up widget info by token ------------------------------------

create or replace function public.get_booking_widget_info(p_token text)
returns table (garage_name text, enabled boolean)
language sql
security definer
set search_path = public
stable
as $$
  select gs.garage_name, gs.booking_widget_enabled
  from garage_settings gs
  where gs.booking_widget_token = p_token;
$$;

grant execute on function public.get_booking_widget_info(text) to anon, authenticated;

-- 4. Public: submit a booking request ----------------------------------------

create or replace function public.create_booking_request(
  p_token text,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_vehicle_registration text,
  p_vehicle_make text,
  p_vehicle_model text,
  p_job_type text,
  p_preferred_date date,
  p_preferred_time time,
  p_notes text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_garage_id uuid;
  v_enabled boolean;
  v_id uuid;
begin
  select gs.id, gs.booking_widget_enabled into v_garage_id, v_enabled
  from garage_settings gs
  where gs.booking_widget_token = p_token;

  if v_garage_id is null then
    raise exception 'Invalid booking link.';
  end if;

  if not v_enabled then
    raise exception 'This garage is not currently accepting online booking requests.';
  end if;

  if p_customer_name is null or btrim(p_customer_name) = '' then
    raise exception 'Name is required.';
  end if;

  if p_job_type not in (
    'vehicle_recovery', 'diagnostic', 'oil_service', 'full_service', 'mot',
    'tyre_replacement', 'vehicle_storage', 'mobile_tyre_fitting',
    'battery_replacement', 'other'
  ) then
    raise exception 'Invalid job type.';
  end if;

  insert into booking_requests (
    garage_id, customer_name, customer_email, customer_phone,
    vehicle_registration, vehicle_make, vehicle_model, job_type,
    preferred_date, preferred_time, notes
  ) values (
    v_garage_id, btrim(p_customer_name), nullif(btrim(p_customer_email), ''), nullif(btrim(p_customer_phone), ''),
    nullif(upper(btrim(p_vehicle_registration)), ''), nullif(btrim(p_vehicle_make), ''), nullif(btrim(p_vehicle_model), ''),
    p_job_type, p_preferred_date, p_preferred_time, nullif(btrim(p_notes), '')
  )
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.create_booking_request(
  text, text, text, text, text, text, text, text, date, time, text
) to anon, authenticated;
