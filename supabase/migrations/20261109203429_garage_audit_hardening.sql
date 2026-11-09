-- Keep public links token-based and scope both link creation and reads to the garage.

create or replace function public.create_vehicle_history_link(p_vehicle_id uuid, p_garage_id uuid)
returns table(id uuid, token text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.has_permission(p_garage_id, 'customers.manage') or not exists (
    select 1 from public.vehicles v where v.id = p_vehicle_id and v.garage_id = p_garage_id
  ) then
    raise exception 'Vehicle not found or access denied.' using errcode = '42501';
  end if;

  return query
  select l.id, l.token from public.vehicle_history_links l
  where l.vehicle_id = p_vehicle_id and l.garage_id = p_garage_id and l.revoked_at is null
  limit 1;
  if found then return; end if;

  return query
  insert into public.vehicle_history_links as l (garage_id, vehicle_id, token)
  values (p_garage_id, p_vehicle_id, replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''))
  returning l.id, l.token;
end;
$$;

create or replace function public.create_feedback_request(p_job_id uuid, p_customer_id uuid, p_garage_id uuid)
returns table(id uuid, token text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (private.has_permission(p_garage_id, 'jobs.manage')
          or private.has_permission(p_garage_id, 'reminders.manage')) or not exists (
    select 1 from public.job_cards j
    join public.customers c on c.id = j.customer_id and c.garage_id = j.garage_id
    where j.id = p_job_id and j.customer_id = p_customer_id and j.garage_id = p_garage_id
  ) then
    raise exception 'Job not found or access denied.' using errcode = '42501';
  end if;

  return query
  insert into public.feedback_requests as r (garage_id, job_id, customer_id, token)
  values (p_garage_id, p_job_id, p_customer_id, replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''))
  returning r.id, r.token;
end;
$$;

-- Staff create links via the checked functions. These tables have no direct
-- staff write callers in the app. Also block direct creation of inconsistent links.
revoke insert, update, delete on public.vehicle_history_links, public.feedback_requests from public, anon, authenticated;
revoke execute on function public.create_vehicle_history_link(uuid,uuid),
  public.create_feedback_request(uuid,uuid,uuid),
  public.create_garage_with_owner(text),
  public.is_garage_member(uuid)
  from public, anon;
grant execute on function public.create_vehicle_history_link(uuid,uuid),
  public.create_feedback_request(uuid,uuid,uuid),
  public.create_garage_with_owner(text),
  public.is_garage_member(uuid)
  to authenticated;
revoke execute on function public.apply_stock_movement() from public, anon, authenticated;

-- A role with settings access must not be able to drop the tenant and its rows.
revoke delete on public.garage_settings from public, anon, authenticated;
drop policy if exists workflow_delete on public.garage_settings;

alter policy booking_requests_select on public.booking_requests
  using (private.has_permission(garage_id, 'bookings.manage'));
alter policy booking_requests_update on public.booking_requests
  using (private.has_permission(garage_id, 'bookings.manage'))
  with check (private.has_permission(garage_id, 'bookings.manage'));

alter policy garage_roles_insert on public.garage_roles
  with check (private.can_manage_team(garage_id) and not is_system
              and not ('*' = any(permissions)));
alter policy garage_roles_update on public.garage_roles
  using (private.can_manage_team(garage_id) and not is_system)
  with check (private.can_manage_team(garage_id) and not is_system
              and not ('*' = any(permissions)));
revoke update on public.garage_roles from public, anon, authenticated;
grant update (name, description, permissions, updated_at) on public.garage_roles to authenticated;

-- Run after the trigger that normalizes the role from role_id.
create or replace function private.guard_last_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_garage uuid;
  owner_added boolean := false;
  owner_removed boolean := false;
begin
  if tg_op = 'INSERT' then
    target_garage := new.garage_id;
    owner_added := new.role = 'owner';
  elsif tg_op = 'UPDATE' then
    if new.garage_id is distinct from old.garage_id or new.user_id is distinct from old.user_id then
      raise exception 'A membership cannot be moved to another garage or user.';
    end if;
    target_garage := old.garage_id;
    owner_added := old.role <> 'owner' and new.role = 'owner';
    owner_removed := old.role = 'owner' and new.role <> 'owner';
  else
    target_garage := old.garage_id;
    owner_removed := old.role = 'owner';
  end if;

  if owner_added or owner_removed then
    perform 1 from public.garage_settings where id = target_garage for update;

    if auth.uid() is not null and not exists (
      select 1 from public.garage_members m
      where m.garage_id = target_garage and m.user_id = auth.uid() and m.role = 'owner'
    ) and not (tg_op = 'INSERT' and new.user_id = auth.uid() and not exists (
      select 1 from public.garage_members m where m.garage_id = target_garage
    )) then
      raise exception 'Only a garage owner can change ownership.' using errcode = '42501';
    end if;

    if owner_removed and not exists (
      select 1 from public.garage_members m
      where m.garage_id = target_garage and m.role = 'owner' and m.id <> old.id
    ) then
      raise exception 'A garage must always have at least one owner.';
    end if;
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_last_owner on public.garage_members;
create trigger trg_verify_garage_owner
before insert or update or delete on public.garage_members
for each row execute function private.guard_last_owner();

-- Existing accounts are attached only once their email is verified. Pending
-- invitations are handled on confirmation as well as confirmed user creation.
create or replace function private.apply_garage_invite()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  matched_user uuid;
  selected_slug text;
begin
  select r.slug into selected_slug
  from public.garage_roles r where r.id = new.role_id and r.garage_id = new.garage_id;
  if selected_slug is null then raise exception 'Invalid role for garage'; end if;

  if selected_slug = 'owner' then
    raise exception 'Assign ownership to an existing member from the team list.';
  end if;

  select u.id into matched_user
  from auth.users u where lower(u.email) = lower(new.email) and u.email_confirmed_at is not null
  limit 1;

  if matched_user is not null then
    insert into public.garage_members (garage_id, user_id, role_id, role, email)
    values (new.garage_id, matched_user, new.role_id, selected_slug, lower(new.email))
    on conflict (garage_id, user_id) do nothing;

    update public.garage_invites set accepted_at = now() where id = new.id;
  end if;
  return new;
end;
$$;

create or replace function private.accept_pending_garage_invites()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  inv record;
begin
  if new.email is null or new.email_confirmed_at is null then return new; end if;

  for inv in
    select i.id, i.garage_id, i.role_id, r.slug
    from public.garage_invites i
    join public.garage_roles r on r.id = i.role_id and r.garage_id = i.garage_id
    where lower(i.email) = lower(new.email) and i.accepted_at is null and r.slug <> 'owner'
  loop
    insert into public.garage_members (garage_id, user_id, role_id, role, email)
    values (inv.garage_id, new.id, inv.role_id, inv.slug, lower(new.email))
    on conflict (garage_id, user_id) do nothing;
    update public.garage_invites set accepted_at = now() where id = inv.id;
  end loop;
  return new;
end;
$$;

drop trigger if exists trg_apply_garage_invite on public.garage_invites;
create trigger trg_apply_garage_invite
after insert or update of role_id, email on public.garage_invites
for each row execute function private.apply_garage_invite();

drop trigger if exists trg_accept_pending_garage_invites on auth.users;
create trigger trg_accept_pending_garage_invites
after insert or update of email_confirmed_at on auth.users
for each row execute function private.accept_pending_garage_invites();

-- Some issued links may predate these checks. Scope reads too, so stale
-- cross-tenant links stop returning data without deleting any records.
create or replace function public.get_vehicle_history_by_token(p_token text)
returns jsonb language plpgsql security definer set search_path = public
as $history$
declare
  v_link vehicle_history_links%rowtype;
  v_result jsonb;
begin
  select * into v_link from vehicle_history_links where token = p_token;
  if not found or v_link.revoked_at is not null then
    return jsonb_build_object('valid', false);
  end if;

  select jsonb_build_object(
    'valid', true,
    'garageName', gs.garage_name,
    'vehicle', jsonb_build_object(
      'registration', v.registration,
      'make', v.make,
      'model', v.model,
      'year', v.year,
      'colour', v.colour
    ),
    'jobs', coalesce((
      select jsonb_agg(job_entry order by job_entry->>'completedAt' desc)
      from (
        select jsonb_build_object(
          'id', jc.id,
          'description', jc.description,
          'customerComplaint', jc.customer_complaint,
          'completedAt', jc.completed_at,
          'mileageIn', jc.mileage_in,
          'jobType', b.job_type,
          'labourLines', coalesce((
            select jsonb_agg(jsonb_build_object('description', jl.description, 'hours', jl.hours))
            from job_labour_lines jl where jl.job_id = jc.id and jl.garage_id = jc.garage_id
          ), '[]'::jsonb),
          'partLines', coalesce((
            select jsonb_agg(jsonb_build_object('description', jpl.description, 'quantity', jpl.quantity))
            from job_part_lines jpl where jpl.job_id = jc.id and jpl.garage_id = jc.garage_id
          ), '[]'::jsonb),
          'vhcSummary', (
            select jsonb_build_object(
              'green', count(*) filter (where vi.result = 'green'),
              'amber', count(*) filter (where vi.result = 'amber'),
              'red', count(*) filter (where vi.result = 'red')
            )
            from vhc_checks vc
            join vhc_items vi on vi.vhc_check_id = vc.id
            where vc.job_id = jc.id and vc.garage_id = jc.garage_id and vi.garage_id = jc.garage_id
          )
        ) as job_entry
        from job_cards jc
        left join bookings b on b.id = jc.booking_id and b.garage_id = jc.garage_id
        where jc.vehicle_id = v_link.vehicle_id
          and jc.garage_id = v_link.garage_id
          and jc.status in ('completed', 'vehicle_released')
      ) jobs
    ), '[]'::jsonb),
    'mileageHistory', coalesce((
      select jsonb_agg(jsonb_build_object('mileage', mh.mileage, 'recordedAt', mh.recorded_at) order by mh.recorded_at desc)
      from vehicle_mileage_history mh
      where mh.vehicle_id = v_link.vehicle_id and mh.garage_id = v_link.garage_id
    ), '[]'::jsonb)
  )
  into v_result
  from vehicles v
  join garage_settings gs on gs.id = v_link.garage_id
  where v.id = v_link.vehicle_id and v.garage_id = v_link.garage_id;

  return coalesce(v_result, jsonb_build_object('valid', false));
end;
$history$;

create or replace function public.open_feedback_request(p_token text)
returns table(request_status text, expired boolean, garage_name text, customer_name text, vehicle_label text, already_responded boolean)
language plpgsql security definer set search_path = public
as $feedback$
declare
  v_request feedback_requests%rowtype;
  v_garage_name text;
  v_customer_name text;
  v_vehicle_label text;
begin
  select * into v_request from feedback_requests where token = p_token;
  if not found or v_request.expires_at <= now() or not exists (
    select 1 from job_cards j
    join customers c on c.id = j.customer_id and c.garage_id = j.garage_id
    where j.id = v_request.job_id and j.customer_id = v_request.customer_id
      and j.garage_id = v_request.garage_id
  ) then
    return query select 'not_found'::text, true, null::text, null::text, null::text, false;
    return;
  end if;

  select gs.garage_name into v_garage_name from garage_settings gs where gs.id = v_request.garage_id;
  select c.full_name into v_customer_name from customers c where c.id = v_request.customer_id;
  select concat_ws(' ', v.make, v.model, '(' || v.registration || ')')
    into v_vehicle_label
    from job_cards jc
    left join vehicles v on v.id = jc.vehicle_id and v.garage_id = jc.garage_id
    where jc.id = v_request.job_id;

  if v_request.status = 'sent' then
    update feedback_requests
    set status = 'opened', opened_at = now()
    where feedback_requests.id = v_request.id and status = 'sent';
  end if;

  return query select
    v_request.status,
    (v_request.expires_at < now()) as expired,
    v_garage_name,
    v_customer_name,
    v_vehicle_label,
    (v_request.status = 'responded');
end;
$feedback$;

create or replace function public.submit_feedback_response(p_token text, p_nps_score integer, p_comment text default null)
returns void language plpgsql security definer set search_path = public
as $submit$
declare
  v_request feedback_requests%rowtype;
begin
  if p_nps_score is null or p_nps_score < 0 or p_nps_score > 10 then
    raise exception 'Score must be between 0 and 10';
  end if;

  select * into v_request from feedback_requests where token = p_token for update;
  if not found or not exists (
    select 1 from job_cards j
    join customers c on c.id = j.customer_id and c.garage_id = j.garage_id
    where j.id = v_request.job_id and j.customer_id = v_request.customer_id
      and j.garage_id = v_request.garage_id
  ) then
    raise exception 'Feedback request not found';
  end if;
  if v_request.status = 'responded' then
    raise exception 'This feedback has already been submitted';
  end if;
  if v_request.expires_at <= now() then
    raise exception 'This feedback link has expired';
  end if;

  insert into feedback_responses (garage_id, request_id, nps_score, comment)
  values (v_request.garage_id, v_request.id, p_nps_score, nullif(p_comment, ''));

  update feedback_requests
  set status = 'responded', responded_at = now()
  where feedback_requests.id = v_request.id;
end;
$submit$;

alter policy feedback_requests_select on public.feedback_requests
  using (private.has_permission(garage_id, 'jobs.manage') or private.has_permission(garage_id, 'reminders.manage'));
alter policy feedback_responses_select on public.feedback_responses
  using (private.has_permission(garage_id, 'jobs.manage') or private.has_permission(garage_id, 'reminders.manage'));
alter policy vehicle_history_links_select on public.vehicle_history_links
  using (private.has_permission(garage_id, 'customers.manage'));

-- Keep the booking, its job card and an optional inbox decision in one transaction.
create or replace function public.save_booking_with_job(
  p_garage_id uuid, p_booking jsonb, p_priority text, p_description text, p_request_id uuid default null
)
returns table(booking_id uuid, job_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  booking public.bookings := jsonb_populate_record(null::public.bookings, p_booking);
  incoming public.booking_requests;
  created_booking_id uuid;
  window_start timestamptz;
  window_end timestamptz;
  conflict text;
begin
  if not private.has_permission(p_garage_id, 'bookings.manage') then
    raise exception 'Booking permission required.' using errcode = '42501';
  end if;
  if booking.date is null or booking.job_type is null then
    raise exception 'Select a booking date and job type.';
  end if;
  if booking.duration_minutes is not null and booking.duration_minutes not between 1 and 1440 then
    raise exception 'Duration must be between 1 and 1440 minutes.';
  end if;
  if booking.est_price < 0 then raise exception 'Price cannot be negative.'; end if;
  if booking.employee_id is not null and not exists (
    select 1 from public.employees e
    where e.id = booking.employee_id and e.garage_id = p_garage_id and e.active
  ) then
    raise exception 'Choose an active employee from this garage.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_garage_id::text, 0));
  if p_request_id is not null then
    select * into incoming from public.booking_requests r
    where r.id = p_request_id and r.garage_id = p_garage_id and r.status = 'pending'
    for update;
    if not found then raise exception 'Booking request not found or already actioned.'; end if;
    booking.job_type := incoming.job_type::public.job_type;
    booking.notes := nullif(concat_ws(' — ', nullif(incoming.notes, ''),
      case when incoming.vehicle_registration is not null then 'Vehicle: ' || incoming.vehicle_registration end), '');
  end if;

  select w.starts_at, w.ends_at into window_start, window_end
  from public.compute_booking_window(p_garage_id, booking.date, booking.time, booking.duration_minutes) w;
  conflict := public.check_booking_conflict(p_garage_id, booking.employee_id, window_start, window_end);
  if conflict is not null then raise exception '%', conflict; end if;

  insert into public.bookings as b (
    garage_id, customer_id, vehicle_id, job_type, date, time, duration_minutes, starts_at, ends_at,
    est_price, technician, employee_id, bay, notes, service_details, location_type,
    address_line, post_code, google_place_id, latitude, longitude
  ) values (
    p_garage_id, booking.customer_id, booking.vehicle_id, booking.job_type, booking.date, booking.time,
    coalesce(booking.duration_minutes, 60), window_start, window_end, booking.est_price, booking.technician,
    booking.employee_id, booking.bay, booking.notes, booking.service_details, coalesce(booking.location_type, 'garage'),
    booking.address_line, booking.post_code, booking.google_place_id, booking.latitude, booking.longitude
  ) returning b.id into created_booking_id;

  insert into public.job_cards as j (
    garage_id, booking_id, customer_id, vehicle_id, status, priority, technician, employee_id,
    description, due_date, notes
  ) values (
    p_garage_id, created_booking_id, booking.customer_id, booking.vehicle_id, 'booked', p_priority, booking.technician,
    booking.employee_id, p_description, booking.date, booking.notes
  ) returning j.id into job_id;

  if p_request_id is not null then
    update public.booking_requests r
    set status = 'converted', decided_at = now(), decided_by = auth.uid(),
        booking_id = created_booking_id
    where r.id = p_request_id;
  end if;
  booking_id := created_booking_id;
  return next;
end;
$$;

revoke execute on function public.save_booking_with_job(uuid,jsonb,text,text,uuid) from public, anon;
grant execute on function public.save_booking_with_job(uuid,jsonb,text,text,uuid) to authenticated;

-- Match the server action permissions for settings, staff leave and VHC
-- when those same tables are accessed directly through the Data API.
do $$
declare
  item record;
begin
  for item in
    select * from (values
      ('garage_opening_hours', 'private.has_permission(garage_id, ''settings.manage'')'),
      ('garage_closures', 'private.has_permission(garage_id, ''settings.manage'')'),
      ('employee_working_hours', 'private.has_permission(garage_id, ''employees.manage'')'),
      ('employee_leave', 'private.has_permission(garage_id, ''employees.manage'')'),
      ('vhc_checks', '(private.has_permission(garage_id, ''jobs.manage'') or private.has_permission(garage_id, ''jobs.update''))'),
      ('vhc_items', '(private.has_permission(garage_id, ''jobs.manage'') or private.has_permission(garage_id, ''jobs.update''))'),
      ('vhc_templates', '(private.has_permission(garage_id, ''jobs.manage'') or private.has_permission(garage_id, ''jobs.update''))'),
      ('vhc_template_items', '(private.has_permission(garage_id, ''jobs.manage'') or private.has_permission(garage_id, ''jobs.update''))')
    ) as rules(table_name, predicate)
  loop
    execute format('alter policy %I on public.%I with check (%s)',
      item.table_name || '_insert', item.table_name, item.predicate);
    execute format('alter policy %I on public.%I using (%s) with check (%s)',
      item.table_name || '_update', item.table_name, item.predicate, item.predicate);
    execute format('alter policy %I on public.%I using (%s)',
      item.table_name || '_delete', item.table_name, item.predicate);
  end loop;
end;
$$;
