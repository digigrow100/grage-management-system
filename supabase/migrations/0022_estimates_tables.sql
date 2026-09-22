-- Creates the proper estimates model (spec 5.10). New records go through
-- this table from now on; the one existing invoices row with
-- status='estimate' is left exactly as-is (a single historic record isn't
-- worth a data migration, per spec's "provide a safe one-time conversion
-- only if required" — it isn't required here).
--
-- Run this once against the project's Postgres database (Supabase SQL
-- Editor, or `supabase db push`).

create table if not exists estimates (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid not null references garage_settings(id) on delete cascade,
  estimate_number text,
  customer_id uuid references customers(id) on delete set null,
  vehicle_id uuid references vehicles(id) on delete set null,
  status text not null default 'draft',
  issue_date date not null default current_date,
  valid_until date,
  notes text,
  subtotal numeric(12,2) not null default 0,
  vat_total numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  booked_job_id uuid references job_cards(id) on delete set null,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint estimates_status_check check (status in ('draft', 'sent', 'accepted', 'declined', 'expired', 'booked'))
);

alter table estimates enable row level security;

drop policy if exists "estimates_select" on estimates;
create policy "estimates_select" on estimates for select to authenticated using (is_garage_member(garage_id));
drop policy if exists "estimates_insert" on estimates;
create policy "estimates_insert" on estimates for insert to authenticated with check (is_garage_member(garage_id));
drop policy if exists "estimates_update" on estimates;
create policy "estimates_update" on estimates for update to authenticated using (is_garage_member(garage_id)) with check (is_garage_member(garage_id));
drop policy if exists "estimates_delete" on estimates;
create policy "estimates_delete" on estimates for delete to authenticated using (is_garage_member(garage_id));

create unique index if not exists estimates_garage_number_key on estimates(garage_id, estimate_number) where estimate_number is not null;
create index if not exists estimates_garage_status_idx on estimates(garage_id, status, created_at desc);
create index if not exists estimates_customer_idx on estimates(customer_id);

create table if not exists estimate_lines (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid not null references garage_settings(id) on delete cascade,
  estimate_id uuid not null references estimates(id) on delete cascade,
  service_id uuid references service_catalogue(id) on delete set null,
  line_type text not null default 'other',
  description text not null,
  quantity numeric(10,2) not null default 1,
  unit_price numeric(12,2) not null default 0,
  vat_rate numeric(5,2),
  line_total numeric(12,2) not null default 0,
  duration_minutes integer,
  sort_order integer not null default 0,
  constraint estimate_lines_line_type_check check (line_type in ('labour', 'part', 'other'))
);

alter table estimate_lines enable row level security;

drop policy if exists "estimate_lines_select" on estimate_lines;
create policy "estimate_lines_select" on estimate_lines for select to authenticated using (is_garage_member(garage_id));
drop policy if exists "estimate_lines_insert" on estimate_lines;
create policy "estimate_lines_insert" on estimate_lines for insert to authenticated with check (is_garage_member(garage_id));
drop policy if exists "estimate_lines_update" on estimate_lines;
create policy "estimate_lines_update" on estimate_lines for update to authenticated using (is_garage_member(garage_id)) with check (is_garage_member(garage_id));
drop policy if exists "estimate_lines_delete" on estimate_lines;
create policy "estimate_lines_delete" on estimate_lines for delete to authenticated using (is_garage_member(garage_id));

create index if not exists estimate_lines_estimate_idx on estimate_lines(estimate_id, sort_order);

-- Per-garage sequential numbering (EST-0001, ...), same pattern as
-- set_invoice_number (0004/0005 migrations): advisory-lock serialized so
-- concurrent inserts can't collide.
create or replace function public.set_estimate_number()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  next_seq int;
begin
  if new.estimate_number is not null and new.estimate_number <> '' then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtext('estimate:' || new.garage_id::text));

  select count(*) + 1 into next_seq from estimates where garage_id = new.garage_id;

  new.estimate_number := 'EST-' || lpad(next_seq::text, 4, '0');
  return new;
end;
$$;

drop trigger if exists trg_set_estimate_number on estimates;
create trigger trg_set_estimate_number
  before insert on estimates
  for each row execute function public.set_estimate_number();
