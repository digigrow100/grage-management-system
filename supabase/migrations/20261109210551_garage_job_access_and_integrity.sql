-- Estimate conversions historically put the employee on the booking only.
-- Inherit it once at creation so a later unassignment actually revokes access.
create function private.set_job_employee()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op='INSERT' and new.employee_id is null and new.booking_id is not null then
    select e.id into new.employee_id from public.bookings b
    join public.employees e on e.id=b.employee_id and e.garage_id=b.garage_id and e.active
    where b.id=new.booking_id and b.garage_id=new.garage_id;
  end if;
  if new.employee_id is not null and not exists (
    select 1 from public.employees e where e.id=new.employee_id and e.garage_id=new.garage_id
  ) then raise exception 'Select an employee from this garage.'; end if;
  return new;
end;
$$;
create trigger set_job_employee before insert or update of employee_id,garage_id on public.job_cards
  for each row execute function private.set_job_employee();
revoke execute on function private.set_job_employee() from public,anon,authenticated;

-- Use the recorded employee ID and a verified staff identity.
create function private.is_technician(p_garage uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists(select 1 from public.garage_members m
    where m.garage_id=p_garage and m.user_id=auth.uid() and m.role='technician');
$$;

create function private.assigned_technician(p_garage uuid, p_job uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.job_cards j
    join public.employees e on e.id=j.employee_id and e.garage_id=j.garage_id and e.active
    join auth.users u on u.id=auth.uid()
    where j.garage_id=p_garage and j.id=p_job and (
      e.user_id=u.id or (
        e.user_id is null and u.email_confirmed_at is not null and lower(trim(e.email))=lower(u.email)
        and 1=(select count(*) from public.employees other where other.garage_id=j.garage_id
          and other.active and lower(trim(other.email))=lower(u.email))
      )
    )
  );
$$;

create function private.job_scope(p_garage uuid,p_job uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select public.is_garage_member(p_garage)
    and exists(select 1 from public.job_cards j where j.id=p_job and j.garage_id=p_garage)
    and (not private.is_technician(p_garage) or private.assigned_technician(p_garage,p_job));
$$;

create function private.can_edit_job(p_garage uuid,p_job uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select private.job_scope(p_garage,p_job) and (
    private.has_permission(p_garage,'jobs.manage') or private.has_permission(p_garage,'jobs.update'));
$$;

create function private.vhc_job_scope(p_garage uuid,p_check uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists(select 1 from public.vhc_checks c
    where c.garage_id=p_garage and c.id=p_check and private.job_scope(p_garage,c.job_id));
$$;

create function private.assigned_job_relation(p_garage uuid,p_id uuid,p_relation text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists(select 1 from public.job_cards j where j.garage_id=p_garage
    and (case p_relation when 'customer' then j.customer_id when 'vehicle' then j.vehicle_id
      when 'booking' then j.booking_id end)=p_id
    and private.assigned_technician(p_garage,j.id));
$$;

create policy technician_job_scope on public.job_cards as restrictive for select to authenticated
  using (private.job_scope(garage_id,id));
create policy technician_job_update on public.job_cards as restrictive for update to authenticated
  using (private.job_scope(garage_id,id)) with check (private.job_scope(garage_id,id));
create policy technician_no_job_create on public.job_cards as restrictive for insert to authenticated
  with check (not private.is_technician(garage_id));

-- Both sides of an UPDATE are checked. The trigger also prevents swapping
-- the identifying fields, even between two assignments the technician can see.
create function private.guard_technician_job_update()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if private.is_technician(old.garage_id) and
    (to_jsonb(new)-array['status','checked_in_at','started_at','completed_at','released_at',
       'customer_complaint','internal_notes','mileage_in','updated_at'])
    is distinct from
    (to_jsonb(old)-array['status','checked_in_at','started_at','completed_at','released_at',
       'customer_complaint','internal_notes','mileage_in','updated_at']) then
    raise exception 'Technicians cannot change job assignments or scheduling.' using errcode='42501';
  end if;
  if current_user='authenticated' and private.is_technician(old.garage_id) and
    (new.status,new.checked_in_at,new.started_at,new.completed_at,new.released_at,new.mileage_in)
    is distinct from
    (old.status,old.checked_in_at,old.started_at,old.completed_at,old.released_at,old.mileage_in) then
    raise exception 'Use the job controls to update status or mileage.' using errcode='42501';
  end if;
  return new;
end;
$$;
create trigger guard_technician_job_update before update on public.job_cards
  for each row execute function private.guard_technician_job_update();

do $$
declare item record;
begin
  for item in select * from (values
    ('job_labour_lines','private.job_scope(garage_id,job_id)'),
    ('job_part_lines','private.job_scope(garage_id,job_id)'),
    ('job_status_history','private.job_scope(garage_id,job_id)'),
    ('invoice_jobs','private.job_scope(garage_id,job_id)'),
    ('vhc_checks','private.job_scope(garage_id,job_id)'),
    ('vhc_items','private.vhc_job_scope(garage_id,vhc_check_id)')
  ) as scope(table_name,predicate)
  loop
    execute format('create policy technician_read_scope on public.%I as restrictive for select to authenticated using (%s)',
      item.table_name,item.predicate);
  end loop;

  for item in select * from (values
    ('job_labour_lines','not private.is_technician(garage_id)'),
    ('job_part_lines','not private.is_technician(garage_id)'),
    ('vhc_templates','not private.is_technician(garage_id)'),
    ('vhc_template_items','not private.is_technician(garage_id)'),
    ('vhc_checks','private.job_scope(garage_id,job_id)'),
    ('vhc_items','private.vhc_job_scope(garage_id,vhc_check_id)')
  ) as scope(table_name,predicate)
  loop
    execute format('create policy technician_insert_scope on public.%I as restrictive for insert to authenticated with check (%s)',
      item.table_name,item.predicate);
    execute format('create policy technician_update_scope on public.%I as restrictive for update to authenticated using (%s) with check (%s)',
      item.table_name,item.predicate,item.predicate);
    execute format('create policy technician_delete_scope on public.%I as restrictive for delete to authenticated using (%s)',
      item.table_name,item.predicate);
  end loop;
end;
$$;

alter policy job_status_history_insert on public.job_status_history
  with check (private.can_edit_job(garage_id,job_id) and changed_by=auth.uid() and not private.is_technician(garage_id));
create policy technician_customer_scope on public.customers as restrictive for select to authenticated
  using (not private.is_technician(garage_id) or private.assigned_job_relation(garage_id,id,'customer'));
create policy technician_vehicle_scope on public.vehicles as restrictive for select to authenticated
  using (not private.is_technician(garage_id) or private.assigned_job_relation(garage_id,id,'vehicle'));
create policy technician_booking_read on public.bookings for select to authenticated
  using (private.is_technician(garage_id) and private.assigned_job_relation(garage_id,id,'booking'));
create policy technician_booking_scope on public.bookings as restrictive for select to authenticated
  using (not private.is_technician(garage_id) or private.assigned_job_relation(garage_id,id,'booking'));
create policy technician_mileage_scope on public.vehicle_mileage_history as restrictive for select to authenticated
  using (not private.is_technician(garage_id) or private.assigned_job_relation(garage_id,vehicle_id,'vehicle'));
alter policy vehicle_mileage_history_insert on public.vehicle_mileage_history
  with check (private.has_permission(garage_id,'customers.manage'));

create function private.vhc_photo_scope(p_name text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.vhc_checks c
    where c.garage_id::text=split_part(p_name,'/',1)
      and c.id::text=split_part(p_name,'/',2)
      and private.vhc_job_scope(c.garage_id,c.id)
  );
$$;
create policy technician_vhc_photo_read on storage.objects as restrictive for select to authenticated
  using (bucket_id<>'vhc-photos' or private.vhc_photo_scope(name));
create policy technician_vhc_photo_insert on storage.objects as restrictive for insert to authenticated
  with check (bucket_id<>'vhc-photos' or private.vhc_photo_scope(name));
create policy technician_vhc_photo_delete on storage.objects as restrictive for delete to authenticated
  using (bucket_id<>'vhc-photos' or private.vhc_photo_scope(name));

revoke execute on function private.is_technician(uuid),private.assigned_technician(uuid,uuid),
  private.job_scope(uuid,uuid),private.can_edit_job(uuid,uuid),private.vhc_job_scope(uuid,uuid),
  private.assigned_job_relation(uuid,uuid,text),private.vhc_photo_scope(text),
  private.guard_technician_job_update() from public,anon;
grant execute on function private.is_technician(uuid),private.job_scope(uuid,uuid),
  private.can_edit_job(uuid,uuid),private.vhc_job_scope(uuid,uuid),
  private.assigned_job_relation(uuid,uuid,text),private.vhc_photo_scope(text) to authenticated;

-- Keep all job lines and both stock representations in one transaction.
-- The part trigger changes stock; job ledger movements record the same delta.
create function private.write_job_lines(
  p_garage uuid,p_job uuid,p_labour jsonb,p_parts jsonb,p_append boolean
) returns void language plpgsql security definer set search_path = ''
as $$
declare
  previous_stock jsonb;
begin
  perform 1 from public.job_cards where id=p_job and garage_id=p_garage for update;
  if not found or not private.can_edit_job(p_garage,p_job) then
    raise exception 'Job not found or access denied.' using errcode='42501';
  end if;
  if exists(select 1 from public.invoices where garage_id=p_garage and job_id=p_job) then
    raise exception 'This job has a legacy invoice. Its lines cannot be changed.';
  end if;
  if jsonb_typeof(p_labour) is distinct from 'array' or jsonb_typeof(p_parts) is distinct from 'array' then
    raise exception 'Invalid job lines.';
  end if;
  if exists (
    select 1 from jsonb_to_recordset(p_labour) l(description text,hours numeric,rate numeric)
    where nullif(trim(l.description),'') is null or l.hours is null or l.hours<0 or l.rate is null or l.rate<0
  ) or exists (
    select 1 from jsonb_to_recordset(p_parts) l(description text,quantity integer,"unitPrice" numeric)
    where nullif(trim(l.description),'') is null or l.quantity is null or l.quantity<1 or l."unitPrice" is null or l."unitPrice"<0
  ) then raise exception 'Enter valid quantities, rates and descriptions.'; end if;

  -- Lock all affected stock rows in one order before any stock is returned.
  perform p.id from public.parts p where p.garage_id=p_garage and p.id in (
    select l.part_id from public.job_part_lines l where l.job_id=p_job and l.garage_id=p_garage
    union select nullif(l."partId",'')::uuid from jsonb_to_recordset(p_parts) l("partId" text)
  ) order by p.id for update;

  select coalesce(jsonb_object_agg(s.part_id,s.quantity),'{}') into previous_stock
  from (select l.part_id,sum(l.quantity) as quantity from public.job_part_lines l
    where l.garage_id=p_garage and l.job_id=p_job and l.part_id is not null and l.stock_consumed
    group by l.part_id) s;

  if p_append then
    insert into public.job_part_lines (garage_id,job_id,part_id,description,quantity,unit_price,cost_price)
      select p_garage,p_job,nullif(l."partId",'')::uuid,l.description,l.quantity,l."unitPrice",coalesce(l."costPrice",0)
      from jsonb_to_recordset(p_parts) l("partId" text,description text,quantity integer,"unitPrice" numeric,"costPrice" numeric);
  else
    perform private.save_job_lines(p_job,p_labour,p_parts);
  end if;

  insert into public.stock_movements (garage_id,part_id,movement_type,quantity,reference_type,reference_id)
    select p_garage,delta.part_id,case when delta.quantity<0 then 'sale' else 'return' end,delta.quantity,'job',p_job
    from (
      select change.part_id,sum(change.quantity) as quantity from (
        select key::uuid as part_id,value::numeric as quantity from jsonb_each_text(previous_stock)
        union all
        select l.part_id,-l.quantity from public.job_part_lines l
        where l.garage_id=p_garage and l.job_id=p_job and l.part_id is not null and l.stock_consumed
      ) change group by change.part_id having sum(change.quantity)<>0
    ) delta;
end;
$$;

create or replace function public.save_workshop_job_lines(p_job uuid,p_labour jsonb,p_parts jsonb)
returns void language sql security definer set search_path = ''
as $$
  select private.write_job_lines((select garage_id from public.job_cards where id=p_job),p_job,p_labour,p_parts,false);
$$;

create function public.save_garage_job_lines(
  p_garage uuid,p_job uuid,p_labour jsonb,p_parts jsonb,p_append boolean default false
) returns void language sql security definer set search_path = ''
as $$
  select private.write_job_lines(p_garage,p_job,p_labour,p_parts,coalesce(p_append,false));
$$;

create function public.record_garage_job_mileage(p_garage uuid,p_job uuid,p_mileage integer)
returns void language plpgsql security definer set search_path = ''
as $$
declare selected_vehicle uuid;
begin
  select j.vehicle_id into selected_vehicle from public.job_cards j
    where j.garage_id=p_garage and j.id=p_job for update;
  if not found or not private.can_edit_job(p_garage,p_job) then
    raise exception 'Job not found or access denied.' using errcode='42501';
  end if;
  if p_mileage is null or p_mileage<0 then raise exception 'Enter a valid mileage.'; end if;
  update public.job_cards set mileage_in=p_mileage where id=p_job;
  if selected_vehicle is not null then
    update public.vehicles set mileage=p_mileage where id=selected_vehicle and garage_id=p_garage;
    if not found then raise exception 'Vehicle not found in this garage.'; end if;
    insert into public.vehicle_mileage_history (garage_id,vehicle_id,job_id,mileage)
      values(p_garage,selected_vehicle,p_job,p_mileage);
  end if;
end;
$$;

revoke execute on function private.save_job_lines(uuid,jsonb,jsonb) from public,anon,authenticated;
revoke execute on function private.write_job_lines(uuid,uuid,jsonb,jsonb,boolean) from public,anon,authenticated;
revoke execute on function public.save_garage_job_lines(uuid,uuid,jsonb,jsonb,boolean),
  public.record_garage_job_mileage(uuid,uuid,integer) from public,anon;
grant execute on function public.save_garage_job_lines(uuid,uuid,jsonb,jsonb,boolean),
  public.record_garage_job_mileage(uuid,uuid,integer) to authenticated;

create policy technician_job_stock_scope on public.stock_movements as restrictive for select to authenticated
  using (reference_type is distinct from 'job' or private.job_scope(garage_id,reference_id)
    or not private.is_technician(garage_id));

create function public.change_garage_job_status(p_garage uuid,p_job uuid,p_status public.job_status,p_reason text default null)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  previous public.job_status;
  allowed text[];
begin
  select status into previous from public.job_cards where garage_id=p_garage and id=p_job for update;
  if not found or not private.can_edit_job(p_garage,p_job) then
    raise exception 'Job not found or access denied.' using errcode='42501';
  end if;
  if previous=p_status then return; end if;
  allowed := case previous::text
    when 'booked' then array['checked_in','cancelled']
    when 'checked_in' then array['booked','in_progress','cancelled']
    when 'in_progress' then array['checked_in','awaiting_parts','awaiting_authorisation','completed','cancelled']
    when 'awaiting_parts' then array['in_progress','cancelled']
    when 'awaiting_authorisation' then array['authorised','in_progress','cancelled']
    when 'authorised' then array['in_progress','completed','cancelled']
    when 'completed' then array['vehicle_released','in_progress']
    when 'vehicle_released' then array['completed']
    when 'cancelled' then array['booked']
    when 'invoiced' then array['completed']
    else array[]::text[]
  end;
  if p_status is null or not (p_status::text=any(allowed)) then
    raise exception 'This status change is not allowed.';
  end if;
  update public.job_cards set status=p_status,
    checked_in_at=case when p_status='checked_in' then now() else checked_in_at end,
    started_at=case when p_status='in_progress' then now() else started_at end,
    completed_at=case when p_status='completed' then now() else completed_at end,
    released_at=case when p_status='vehicle_released' then now() else released_at end
    where id=p_job;
  insert into public.job_status_history (garage_id,job_id,previous_status,new_status,reason,changed_by)
    values(p_garage,p_job,previous,p_status,nullif(trim(p_reason),''),auth.uid());
end;
$$;

revoke execute on function public.change_garage_job_status(uuid,uuid,public.job_status,text) from public,anon;
grant execute on function public.change_garage_job_status(uuid,uuid,public.job_status,text) to authenticated;
