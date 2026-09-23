-- Phase 4c: Digital service history — a public, no-login shareable link per
-- vehicle showing its completed job history, VHC results and mileage log.
-- Purely additive/greenfield: grep across all prior migrations confirms no
-- service_history/vehicle_history table exists anywhere.
--
-- Replicates the exact public-access pattern established for feedback
-- (migration 0028): no anon RLS policy on the underlying table at all —
-- every public read goes through a SECURITY DEFINER RPC that validates the
-- token itself and returns only display-safe fields (never garage_id or
-- any other tenant-internal identifier). Unlike feedback_requests (single
-- use, expires), a service-history link is meant to be reused by the
-- customer indefinitely, so instead of expiry it supports revocation.

create table if not exists vehicle_history_links (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid not null references garage_settings(id) on delete cascade,
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  token text not null,
  created_by uuid,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

alter table vehicle_history_links enable row level security;

drop policy if exists "vehicle_history_links_select" on vehicle_history_links;
create policy "vehicle_history_links_select" on vehicle_history_links for select to authenticated using (is_garage_member(garage_id));
drop policy if exists "vehicle_history_links_insert" on vehicle_history_links;
create policy "vehicle_history_links_insert" on vehicle_history_links for insert to authenticated with check (is_garage_member(garage_id));
drop policy if exists "vehicle_history_links_update" on vehicle_history_links;
create policy "vehicle_history_links_update" on vehicle_history_links for update to authenticated using (is_garage_member(garage_id)) with check (is_garage_member(garage_id));
drop policy if exists "vehicle_history_links_delete" on vehicle_history_links;
create policy "vehicle_history_links_delete" on vehicle_history_links for delete to authenticated using (is_garage_member(garage_id));

create unique index if not exists vehicle_history_links_token_key on vehicle_history_links(token);
create index if not exists vehicle_history_links_vehicle_idx on vehicle_history_links(vehicle_id) where revoked_at is null;

-- Staff-side: return the vehicle's existing active link if one exists,
-- otherwise mint a new one. Idempotent, so "get share link" is safe to
-- call repeatedly from the UI without spawning duplicate tokens.
create or replace function create_vehicle_history_link(
  p_vehicle_id uuid,
  p_garage_id uuid
)
returns table (id uuid, token text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token text;
  v_id uuid;
begin
  if not is_garage_member(p_garage_id) then
    raise exception 'Not authorised for this garage';
  end if;

  select vhl.id, vhl.token into v_id, v_token
  from vehicle_history_links vhl
  where vhl.vehicle_id = p_vehicle_id
    and vhl.garage_id = p_garage_id
    and vhl.revoked_at is null
  limit 1;

  if v_id is not null then
    return query select v_id, v_token;
    return;
  end if;

  v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');

  insert into vehicle_history_links (garage_id, vehicle_id, token)
  values (p_garage_id, p_vehicle_id, v_token)
  returning vehicle_history_links.id into v_id;

  return query select v_id, v_token;
end;
$$;

-- Public: look up a vehicle's full service history by token (no auth).
-- Returns a single jsonb payload (vehicle summary + completed jobs, each
-- with its labour/parts/VHC summary + mileage log) rather than several
-- RPCs, since the page needs it all at once and jsonb keeps this to one
-- round trip.
create or replace function get_vehicle_history_by_token(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
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
            from job_labour_lines jl where jl.job_id = jc.id
          ), '[]'::jsonb),
          'partLines', coalesce((
            select jsonb_agg(jsonb_build_object('description', jpl.description, 'quantity', jpl.quantity))
            from job_part_lines jpl where jpl.job_id = jc.id
          ), '[]'::jsonb),
          'vhcSummary', (
            select jsonb_build_object(
              'green', count(*) filter (where vi.result = 'green'),
              'amber', count(*) filter (where vi.result = 'amber'),
              'red', count(*) filter (where vi.result = 'red')
            )
            from vhc_checks vc
            join vhc_items vi on vi.vhc_check_id = vc.id
            where vc.job_id = jc.id
          )
        ) as job_entry
        from job_cards jc
        left join bookings b on b.id = jc.booking_id
        where jc.vehicle_id = v_link.vehicle_id
          and jc.status in ('completed', 'vehicle_released')
      ) jobs
    ), '[]'::jsonb),
    'mileageHistory', coalesce((
      select jsonb_agg(jsonb_build_object('mileage', mh.mileage, 'recordedAt', mh.recorded_at) order by mh.recorded_at desc)
      from vehicle_mileage_history mh
      where mh.vehicle_id = v_link.vehicle_id
    ), '[]'::jsonb)
  )
  into v_result
  from vehicles v
  join garage_settings gs on gs.id = v_link.garage_id
  where v.id = v_link.vehicle_id;

  return v_result;
end;
$$;
