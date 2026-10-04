-- Cover auxiliary inventory paths, including the existing receiving RPC.
do $$
declare t text;pol record;begin
 foreach t in array array['stock_movements','purchase_order_lines','purchase_orders','warehouses','suppliers'] loop
 for pol in select policyname from pg_policies where schemaname='public' and tablename=t loop execute format('drop policy %I on public.%I',pol.policyname,t);end loop;
 execute format('create policy inventory_read on public.%I for select to authenticated using(private.has_permission(garage_id,''inventory.manage'') or private.has_permission(garage_id,''inventory.view'') or private.has_permission(garage_id,''accounting.manage''))',t);
 execute format('create policy inventory_insert on public.%I for insert to authenticated with check(private.has_permission(garage_id,''inventory.manage''))',t);
 if t<>'stock_movements' then
 execute format('create policy inventory_update on public.%I for update to authenticated using(private.has_permission(garage_id,''inventory.manage'')) with check(private.has_permission(garage_id,''inventory.manage''))',t);
 execute format('create policy inventory_delete on public.%I for delete to authenticated using(private.has_permission(garage_id,''inventory.manage''))',t);
 end if;
 end loop;
end $$;
CREATE OR REPLACE FUNCTION public.receive_purchase_order_line(p_line_id uuid, p_quantity numeric, p_unit_cost numeric DEFAULT NULL::numeric)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  if not private.has_permission(v_line.garage_id, 'inventory.manage') then
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
$function$
;
revoke all on function public.receive_purchase_order_line(uuid,numeric,numeric) from public,anon;
grant execute on function public.receive_purchase_order_line(uuid,numeric,numeric) to authenticated;
