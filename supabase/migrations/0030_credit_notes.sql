-- Phase 4b: Advanced invoicing — credit notes. Purely additive/greenfield:
-- grep across all prior migrations and database.types.ts confirms no
-- credit_note/refund table exists anywhere. Mirrors the shape and RLS
-- pattern of invoices/invoice_line_items, including a per-garage
-- sequential numbering trigger analogous to set_invoice_number().

create table if not exists credit_notes (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid not null references garage_settings(id) on delete cascade,
  invoice_id uuid not null references invoices(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  number text,
  date date not null default current_date,
  status text not null default 'draft',
  reason text,
  vat_rate numeric not null default 0,
  notes text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint credit_notes_status_check check (status in ('draft', 'issued', 'void'))
);

alter table credit_notes enable row level security;

drop policy if exists "credit_notes_select" on credit_notes;
create policy "credit_notes_select" on credit_notes for select to authenticated using (is_garage_member(garage_id));
drop policy if exists "credit_notes_insert" on credit_notes;
create policy "credit_notes_insert" on credit_notes for insert to authenticated with check (is_garage_member(garage_id));
drop policy if exists "credit_notes_update" on credit_notes;
create policy "credit_notes_update" on credit_notes for update to authenticated using (is_garage_member(garage_id)) with check (is_garage_member(garage_id));
drop policy if exists "credit_notes_delete" on credit_notes;
create policy "credit_notes_delete" on credit_notes for delete to authenticated using (is_garage_member(garage_id));

create unique index if not exists credit_notes_garage_number_key on credit_notes(garage_id, number) where number is not null;
create index if not exists credit_notes_garage_status_idx on credit_notes(garage_id, status, date desc);
create index if not exists credit_notes_invoice_idx on credit_notes(invoice_id);

create table if not exists credit_note_line_items (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid not null references garage_settings(id) on delete cascade,
  credit_note_id uuid not null references credit_notes(id) on delete cascade,
  description text not null,
  quantity numeric not null default 1,
  unit_price numeric not null default 0,
  created_at timestamptz not null default now()
);

alter table credit_note_line_items enable row level security;

drop policy if exists "credit_note_line_items_select" on credit_note_line_items;
create policy "credit_note_line_items_select" on credit_note_line_items for select to authenticated using (is_garage_member(garage_id));
drop policy if exists "credit_note_line_items_insert" on credit_note_line_items;
create policy "credit_note_line_items_insert" on credit_note_line_items for insert to authenticated with check (is_garage_member(garage_id));
drop policy if exists "credit_note_line_items_update" on credit_note_line_items;
create policy "credit_note_line_items_update" on credit_note_line_items for update to authenticated using (is_garage_member(garage_id)) with check (is_garage_member(garage_id));
drop policy if exists "credit_note_line_items_delete" on credit_note_line_items;
create policy "credit_note_line_items_delete" on credit_note_line_items for delete to authenticated using (is_garage_member(garage_id));

create index if not exists credit_note_line_items_note_idx on credit_note_line_items(credit_note_id);

-- Per-garage sequential numbering, same count(*)+1 approach as
-- set_invoice_number() in migration 0004 (scoped by garage_id, only fires
-- when the caller hasn't already supplied a number).
create or replace function set_credit_note_number()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_next int;
begin
  if new.number is not null then
    return new;
  end if;

  select count(*) + 1 into v_next from credit_notes where garage_id = new.garage_id;
  new.number := 'CN-' || lpad(v_next::text, 4, '0');
  return new;
end;
$$;

drop trigger if exists trg_set_credit_note_number on credit_notes;
create trigger trg_set_credit_note_number
  before insert on credit_notes
  for each row execute function set_credit_note_number();
