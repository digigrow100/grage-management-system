-- Phase 3c: full stock management (spec: suppliers, warehouses, stock
-- ledger, purchase orders; parts extended to tyres/consumables/wheels).
-- Additive only: existing `parts` table/columns are untouched except for
-- new nullable columns, so existing PartInput/addPart/updatePart/getParts
-- and the /inventory UI keep working unmodified until they opt in.

-- 1. Suppliers -----------------------------------------------------------

create table if not exists suppliers (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid not null references garage_settings(id) on delete cascade,
  name text not null,
  account_number text,
  contact_name text,
  email text,
  phone text,
  address_line_1 text,
  address_line_2 text,
  city text,
  postcode text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table suppliers enable row level security;

drop policy if exists "suppliers_select" on suppliers;
create policy "suppliers_select" on suppliers for select to authenticated using (is_garage_member(garage_id));
drop policy if exists "suppliers_insert" on suppliers;
create policy "suppliers_insert" on suppliers for insert to authenticated with check (is_garage_member(garage_id));
drop policy if exists "suppliers_update" on suppliers;
create policy "suppliers_update" on suppliers for update to authenticated using (is_garage_member(garage_id)) with check (is_garage_member(garage_id));
drop policy if exists "suppliers_delete" on suppliers;
create policy "suppliers_delete" on suppliers for delete to authenticated using (is_garage_member(garage_id));

create index if not exists suppliers_garage_name_idx on suppliers(garage_id, name);

-- 2. Warehouses / stock locations -----------------------------------------

create table if not exists warehouses (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid not null references garage_settings(id) on delete cascade,
  name text not null,
  is_default boolean not null default false,
  address_line_1 text,
  address_line_2 text,
  city text,
  postcode text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table warehouses enable row level security;

drop policy if exists "warehouses_select" on warehouses;
create policy "warehouses_select" on warehouses for select to authenticated using (is_garage_member(garage_id));
drop policy if exists "warehouses_insert" on warehouses;
create policy "warehouses_insert" on warehouses for insert to authenticated with check (is_garage_member(garage_id));
drop policy if exists "warehouses_update" on warehouses;
create policy "warehouses_update" on warehouses for update to authenticated using (is_garage_member(garage_id)) with check (is_garage_member(garage_id));
drop policy if exists "warehouses_delete" on warehouses;
create policy "warehouses_delete" on warehouses for delete to authenticated using (is_garage_member(garage_id));

create index if not exists warehouses_garage_idx on warehouses(garage_id);

-- Only one default warehouse per garage.
create unique index if not exists warehouses_garage_default_key
  on warehouses(garage_id) where is_default;

-- Backfill: every existing garage gets a "Main store" default warehouse so
-- stock movements have somewhere to point at without forcing a setup step.
insert into warehouses (garage_id, name, is_default)
select gs.id, 'Main store', true
from garage_settings gs
where not exists (select 1 from warehouses w where w.garage_id = gs.id);

-- 3. Parts: product type + supplier/warehouse linkage + tyre attributes ---

alter table parts add column if not exists product_type text not null default 'part';
alter table parts add column if not exists supplier_id uuid references suppliers(id) on delete set null;
alter table parts add column if not exists default_warehouse_id uuid references warehouses(id) on delete set null;
alter table parts add column if not exists tyre_width int;
alter table parts add column if not exists tyre_profile int;
alter table parts add column if not exists tyre_rim_size numeric(4,1);
alter table parts add column if not exists tyre_load_index text;
alter table parts add column if not exists tyre_speed_rating text;

alter table parts drop constraint if exists parts_product_type_check;
alter table parts add constraint parts_product_type_check
  check (product_type in ('part', 'tyre', 'consumable', 'wheel'));

create index if not exists parts_garage_type_idx on parts(garage_id, product_type);
create index if not exists parts_supplier_idx on parts(supplier_id);

-- The existing global unique index on sku is a pre-existing constraint from
-- before tenant scoping was introduced; left as-is (not in scope here).

-- 4. Stock movement ledger -------------------------------------------------

create table if not exists stock_movements (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid not null references garage_settings(id) on delete cascade,
  part_id uuid not null references parts(id) on delete cascade,
  warehouse_id uuid references warehouses(id) on delete set null,
  movement_type text not null,
  quantity numeric not null,
  unit_cost numeric(12,2),
  reference_type text,
  reference_id uuid,
  notes text,
  created_by uuid,
  created_at timestamptz not null default now(),
  constraint stock_movements_type_check check (
    movement_type in ('receipt', 'sale', 'adjustment', 'return', 'transfer', 'stocktake')
  ),
  constraint stock_movements_quantity_nonzero check (quantity <> 0)
);

alter table stock_movements enable row level security;

drop policy if exists "stock_movements_select" on stock_movements;
create policy "stock_movements_select" on stock_movements for select to authenticated using (is_garage_member(garage_id));
drop policy if exists "stock_movements_insert" on stock_movements;
create policy "stock_movements_insert" on stock_movements for insert to authenticated with check (is_garage_member(garage_id));
-- Movements are an append-only audit ledger: no update/delete policies.

create index if not exists stock_movements_garage_part_idx on stock_movements(garage_id, part_id, created_at desc);
create index if not exists stock_movements_reference_idx on stock_movements(reference_type, reference_id);

-- Keep parts.stock_level as the authoritative running total, maintained
-- from the ledger so every UI reading parts.stock_level today keeps working
-- unmodified while gaining a full audit trail.
create or replace function apply_stock_movement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update parts
  set stock_level = stock_level + new.quantity,
      updated_at = now()
  where id = new.part_id
    and garage_id = new.garage_id;

  return new;
end;
$$;

drop trigger if exists stock_movements_apply on stock_movements;
create trigger stock_movements_apply
  after insert on stock_movements
  for each row execute function apply_stock_movement();

-- 5. Purchase orders --------------------------------------------------------

create table if not exists purchase_orders (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid not null references garage_settings(id) on delete cascade,
  po_number text,
  supplier_id uuid references suppliers(id) on delete set null,
  warehouse_id uuid references warehouses(id) on delete set null,
  status text not null default 'draft',
  order_date date,
  expected_date date,
  notes text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint purchase_orders_status_check check (
    status in ('draft', 'ordered', 'partially_received', 'received', 'cancelled')
  )
);

alter table purchase_orders enable row level security;

drop policy if exists "purchase_orders_select" on purchase_orders;
create policy "purchase_orders_select" on purchase_orders for select to authenticated using (is_garage_member(garage_id));
drop policy if exists "purchase_orders_insert" on purchase_orders;
create policy "purchase_orders_insert" on purchase_orders for insert to authenticated with check (is_garage_member(garage_id));
drop policy if exists "purchase_orders_update" on purchase_orders;
create policy "purchase_orders_update" on purchase_orders for update to authenticated using (is_garage_member(garage_id)) with check (is_garage_member(garage_id));
drop policy if exists "purchase_orders_delete" on purchase_orders;
create policy "purchase_orders_delete" on purchase_orders for delete to authenticated using (is_garage_member(garage_id));

create unique index if not exists purchase_orders_garage_number_key on purchase_orders(garage_id, po_number) where po_number is not null;
create index if not exists purchase_orders_garage_status_idx on purchase_orders(garage_id, status, created_at desc);

create sequence if not exists purchase_order_number_seq;

create or replace function set_purchase_order_number()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.po_number is null then
    new.po_number := 'PO-' || lpad(nextval('purchase_order_number_seq')::text, 5, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists purchase_orders_set_number on purchase_orders;
create trigger purchase_orders_set_number
  before insert on purchase_orders
  for each row execute function set_purchase_order_number();

create table if not exists purchase_order_lines (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid not null references garage_settings(id) on delete cascade,
  purchase_order_id uuid not null references purchase_orders(id) on delete cascade,
  part_id uuid references parts(id) on delete set null,
  description text not null,
  quantity_ordered numeric not null default 1,
  quantity_received numeric not null default 0,
  unit_cost numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  constraint purchase_order_lines_quantity_check check (quantity_ordered > 0 and quantity_received >= 0)
);

alter table purchase_order_lines enable row level security;

drop policy if exists "purchase_order_lines_select" on purchase_order_lines;
create policy "purchase_order_lines_select" on purchase_order_lines for select to authenticated using (is_garage_member(garage_id));
drop policy if exists "purchase_order_lines_insert" on purchase_order_lines;
create policy "purchase_order_lines_insert" on purchase_order_lines for insert to authenticated with check (is_garage_member(garage_id));
drop policy if exists "purchase_order_lines_update" on purchase_order_lines;
create policy "purchase_order_lines_update" on purchase_order_lines for update to authenticated using (is_garage_member(garage_id)) with check (is_garage_member(garage_id));
drop policy if exists "purchase_order_lines_delete" on purchase_order_lines;
create policy "purchase_order_lines_delete" on purchase_order_lines for delete to authenticated using (is_garage_member(garage_id));

create index if not exists purchase_order_lines_po_idx on purchase_order_lines(purchase_order_id);

-- 6. Receiving function: atomically records a receipt line + stock ledger
--    entry + updates the PO line's received quantity + rolls up PO status.

create or replace function receive_purchase_order_line(
  p_line_id uuid,
  p_quantity numeric,
  p_unit_cost numeric default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_line purchase_order_lines%rowtype;
  v_po purchase_orders%rowtype;
  v_remaining_lines int;
begin
  if p_quantity <= 0 then
    raise exception 'Quantity to receive must be positive';
  end if;

  select * into v_line from purchase_order_lines where id = p_line_id for update;
  if not found then
    raise exception 'Purchase order line not found';
  end if;
  if not is_garage_member(v_line.garage_id) then
    raise exception 'Not authorised for this garage';
  end if;

  select * into v_po from purchase_orders where id = v_line.purchase_order_id for update;
  if v_po.status = 'cancelled' then
    raise exception 'Cannot receive against a cancelled purchase order';
  end if;

  if v_line.quantity_received + p_quantity > v_line.quantity_ordered then
    raise exception 'Cannot receive more than the ordered quantity';
  end if;

  update purchase_order_lines
  set quantity_received = quantity_received + p_quantity
  where id = p_line_id;

  if v_line.part_id is not null then
    insert into stock_movements (
      garage_id, part_id, warehouse_id, movement_type, quantity, unit_cost,
      reference_type, reference_id
    ) values (
      v_line.garage_id, v_line.part_id, v_po.warehouse_id, 'receipt', p_quantity,
      coalesce(p_unit_cost, v_line.unit_cost), 'purchase_order', v_po.id
    );
  end if;

  select count(*) into v_remaining_lines
  from purchase_order_lines
  where purchase_order_id = v_po.id
    and quantity_received < quantity_ordered;

  update purchase_orders
  set status = case when v_remaining_lines = 0 then 'received' else 'partially_received' end,
      updated_at = now()
  where id = v_po.id;
end;
$$;
