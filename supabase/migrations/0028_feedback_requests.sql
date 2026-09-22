-- Phase 3e: Customer Intelligence feedback loop (spec: feedback requests
-- sent after a job, a public token-based page for the customer to respond
-- with no login, and NPS-style metrics). Purely additive/greenfield — no
-- existing feedback/review/rating/nps table anywhere in the schema.
--
-- This is the first public, unauthenticated flow in the app. Rather than
-- inventing an anon-RLS policy (no precedent in this codebase — every
-- existing table gates on is_garage_member() for the `authenticated`
-- role only), the public flow is entirely mediated by two SECURITY
-- DEFINER RPC functions that validate the token themselves. The
-- underlying tables keep the same staff-only RLS shape as everything
-- else; nothing is directly selectable/writable by `anon`.

create table if not exists feedback_requests (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid not null references garage_settings(id) on delete cascade,
  job_id uuid not null references job_cards(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  token text not null,
  status text not null default 'sent',
  channel text not null default 'link',
  sent_at timestamptz not null default now(),
  opened_at timestamptz,
  responded_at timestamptz,
  expires_at timestamptz not null default (now() + interval '30 days'),
  created_by uuid,
  created_at timestamptz not null default now(),
  constraint feedback_requests_status_check check (status in ('sent', 'opened', 'responded', 'expired')),
  constraint feedback_requests_channel_check check (channel in ('link', 'email', 'sms'))
);

alter table feedback_requests enable row level security;

drop policy if exists "feedback_requests_select" on feedback_requests;
create policy "feedback_requests_select" on feedback_requests for select to authenticated using (is_garage_member(garage_id));
drop policy if exists "feedback_requests_insert" on feedback_requests;
create policy "feedback_requests_insert" on feedback_requests for insert to authenticated with check (is_garage_member(garage_id));
drop policy if exists "feedback_requests_update" on feedback_requests;
create policy "feedback_requests_update" on feedback_requests for update to authenticated using (is_garage_member(garage_id)) with check (is_garage_member(garage_id));
drop policy if exists "feedback_requests_delete" on feedback_requests;
create policy "feedback_requests_delete" on feedback_requests for delete to authenticated using (is_garage_member(garage_id));

create unique index if not exists feedback_requests_token_key on feedback_requests(token);
create index if not exists feedback_requests_garage_status_idx on feedback_requests(garage_id, status, created_at desc);
create index if not exists feedback_requests_job_idx on feedback_requests(job_id);

create table if not exists feedback_responses (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid not null references garage_settings(id) on delete cascade,
  request_id uuid not null references feedback_requests(id) on delete cascade,
  nps_score int not null,
  comment text,
  submitted_at timestamptz not null default now(),
  constraint feedback_responses_nps_score_check check (nps_score between 0 and 10),
  constraint feedback_responses_request_key unique (request_id)
);

alter table feedback_responses enable row level security;

drop policy if exists "feedback_responses_select" on feedback_responses;
create policy "feedback_responses_select" on feedback_responses for select to authenticated using (is_garage_member(garage_id));
-- No insert/update/delete policies for `authenticated` — responses are
-- only ever written by the public submit_feedback_response() RPC below.

create index if not exists feedback_responses_garage_idx on feedback_responses(garage_id, submitted_at desc);

-- Staff-side: create a request with a random opaque token.
create or replace function create_feedback_request(
  p_job_id uuid,
  p_customer_id uuid,
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

  v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');

  insert into feedback_requests (garage_id, job_id, customer_id, token)
  values (p_garage_id, p_job_id, p_customer_id, v_token)
  returning feedback_requests.id into v_id;

  return query select v_id, v_token;
end;
$$;

-- Public: look up a request by token (no auth). Marks it "opened" on
-- first view. Returns only the minimal display fields a customer needs,
-- never garage_id or any other tenant-internal identifier.
create or replace function open_feedback_request(p_token text)
returns table (
  request_status text,
  expired boolean,
  garage_name text,
  customer_name text,
  vehicle_label text,
  already_responded boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request feedback_requests%rowtype;
  v_garage_name text;
  v_customer_name text;
  v_vehicle_label text;
begin
  select * into v_request from feedback_requests where token = p_token;
  if not found then
    return query select 'not_found'::text, true, null::text, null::text, null::text, false;
    return;
  end if;

  select gs.garage_name into v_garage_name from garage_settings gs where gs.id = v_request.garage_id;
  select c.full_name into v_customer_name from customers c where c.id = v_request.customer_id;
  select concat_ws(' ', v.make, v.model, '(' || v.registration || ')')
    into v_vehicle_label
    from job_cards jc
    left join vehicles v on v.id = jc.vehicle_id
    where jc.id = v_request.job_id;

  if v_request.status = 'sent' then
    update feedback_requests
    set status = 'opened', opened_at = now()
    where feedback_requests.id = v_request.id;
  end if;

  return query select
    v_request.status,
    (v_request.expires_at < now()) as expired,
    v_garage_name,
    v_customer_name,
    v_vehicle_label,
    (v_request.status = 'responded');
end;
$$;

-- Public: submit a response by token (no auth).
create or replace function submit_feedback_response(
  p_token text,
  p_nps_score int,
  p_comment text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request feedback_requests%rowtype;
begin
  if p_nps_score < 0 or p_nps_score > 10 then
    raise exception 'Score must be between 0 and 10';
  end if;

  select * into v_request from feedback_requests where token = p_token for update;
  if not found then
    raise exception 'Feedback request not found';
  end if;
  if v_request.status = 'responded' then
    raise exception 'This feedback has already been submitted';
  end if;
  if v_request.expires_at < now() then
    raise exception 'This feedback link has expired';
  end if;

  insert into feedback_responses (garage_id, request_id, nps_score, comment)
  values (v_request.garage_id, v_request.id, p_nps_score, nullif(p_comment, ''));

  update feedback_requests
  set status = 'responded', responded_at = now()
  where feedback_requests.id = v_request.id;
end;
$$;
