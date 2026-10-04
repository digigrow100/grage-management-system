-- Complete garage workflows. Existing stock is not retroactively deducted.
create schema if not exists private;
grant usage on schema private to authenticated;
create or replace function private.has_permission(g uuid, permission text)
returns boolean language sql stable security definer set search_path = '' as $$
 select auth.uid() is not null and exists (
 select 1 from public.garage_members m left join public.garage_roles r on r.id=m.role_id and r.garage_id=m.garage_id
 where m.garage_id=g and m.user_id=auth.uid() and
 (m.role in ('owner','admin') or '*'=any(coalesce(r.permissions,'{}')) or permission=any(coalesce(r.permissions,'{}'))));
$$;
revoke all on function private.has_permission(uuid,text) from public;
grant execute on function private.has_permission(uuid,text) to authenticated;
create or replace function public.my_garage_permissions(p_garage uuid)
returns text[] language sql stable security invoker set search_path = '' as $$
 select case when m.role in ('owner','admin') then array['*'] else coalesce(r.permissions,'{}') end
 from public.garage_members m left join public.garage_roles r on r.id=m.role_id and r.garage_id=m.garage_id
 where m.garage_id=p_garage and m.user_id=auth.uid();
$$;
revoke all on function public.my_garage_permissions(uuid) from public;
grant execute on function public.my_garage_permissions(uuid) to authenticated;
-- Replace permissive membership-only policies on operational tables.
do $$ declare t text; resource text; p record; readable text; writable text; begin
 for t,resource in select * from (values
 ('customers','customers'),('vehicles','customers'),('bookings','bookings'),('job_cards','jobs'),
 ('job_labour_lines','jobs'),('job_part_lines','jobs'),('invoices','invoices'),('invoice_line_items','invoices'),
 ('parts','inventory'),('employees','employees'),('reminders','reminders'),('garage_settings','settings')) x loop
 for p in select policyname from pg_policies where schemaname='public' and tablename=t loop
 execute format('drop policy %I on public.%I',p.policyname,t); end loop;
 writable=format('private.has_permission(garage_id,%L)',resource||'.manage');
 if resource='jobs' then writable=writable||' or private.has_permission(garage_id,''jobs.update'')'; end if;
 readable=writable||format(' or private.has_permission(garage_id,%L)',resource||'.view');
 if resource in ('customers','inventory','employees') then readable=readable||' or private.has_permission(garage_id,''jobs.view'') or private.has_permission(garage_id,''jobs.manage'') or private.has_permission(garage_id,''bookings.manage'')'; end if;
 if resource='customers' then readable=readable||' or private.has_permission(garage_id,''invoices.manage'') or private.has_permission(garage_id,''invoices.view'') or private.has_permission(garage_id,''reminders.manage'')'; end if;
 if resource in ('jobs','invoices','inventory') then readable=readable||' or private.has_permission(garage_id,''reports.view'') or private.has_permission(garage_id,''accounting.manage'')'; end if;
 if resource='settings' then readable='public.is_garage_member(id)'; writable='private.has_permission(id,''settings.manage'')'; end if;
 execute format('create policy workflow_read on public.%I for select to authenticated using (%s)',t,readable);
 execute format('create policy workflow_insert on public.%I for insert to authenticated with check (%s)',t,writable);
 execute format('create policy workflow_update on public.%I for update to authenticated using (%s) with check (%s)',t,writable,writable);
 -- jobs.update does not permit deleting jobs or their entire history.
 execute format('create policy workflow_delete on public.%I for delete to authenticated using (%s)',t,case when resource='jobs' and t='job_cards' then 'private.has_permission(garage_id,''jobs.manage'')' else writable end);
 end loop; end $$;

create table public.invoice_payments (
 id uuid primary key default gen_random_uuid(), garage_id uuid not null references public.garage_settings(id),
 invoice_id uuid not null references public.invoices(id) on delete restrict,
 amount numeric(12,2) not null check(amount>0), paid_on date not null, method text not null check(method in ('cash','bank_transfer','card','other')),
 reference text, created_by uuid default auth.uid(), created_at timestamptz not null default now());
create index invoice_payments_invoice_idx on public.invoice_payments(invoice_id);
create index invoice_payments_garage_date_idx on public.invoice_payments(garage_id,paid_on);
alter table public.invoice_payments enable row level security;
create policy payments_read on public.invoice_payments for select to authenticated using
 (private.has_permission(garage_id,'invoices.manage') or private.has_permission(garage_id,'invoices.view') or private.has_permission(garage_id,'accounting.manage') or private.has_permission(garage_id,'reports.view'));
grant select on public.invoice_payments to authenticated;
create table public.garage_expenses (
 id uuid primary key default gen_random_uuid(),garage_id uuid not null references public.garage_settings(id),
 description text not null check(length(trim(description))>0), category text not null,
 amount numeric(12,2) not null check(amount>0), spent_on date not null,created_at timestamptz default now(),created_by uuid default auth.uid());
alter table public.garage_expenses enable row level security;
create index garage_expenses_garage_date_idx on public.garage_expenses(garage_id,spent_on);
create policy expenses_read on public.garage_expenses for select to authenticated using(private.has_permission(garage_id,'accounting.manage'));
create policy expenses_add on public.garage_expenses for insert to authenticated with check(private.has_permission(garage_id,'accounting.manage') and created_by=auth.uid());
grant select,insert on public.garage_expenses to authenticated;
alter table public.job_part_lines add column cost_price numeric(12,2) not null default 0;
alter table public.job_part_lines add column stock_consumed boolean not null default false;
update public.job_part_lines l set cost_price=p.cost_price from public.parts p where p.id=l.part_id and p.garage_id=l.garage_id;

-- Locks serialise payments; amount cannot exceed invoice balance. Paid legacy invoices are imported once.
create or replace function private.record_payment(p_invoice uuid,p_amount numeric,p_date date,p_method text,p_reference text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare i public.invoices; total numeric; paid numeric; result uuid; begin
 select * into i from public.invoices where id=p_invoice for update;
 if not found or not private.has_permission(i.garage_id,'invoices.manage') then raise exception 'You cannot record payments for this invoice.'; end if;
 if i.status='estimate' then raise exception 'Convert the estimate to an invoice first.'; end if;
 select round(coalesce(sum(quantity*unit_price),0)*(1+i.vat_rate/100),2) into total from public.invoice_line_items where invoice_id=i.id;
 select coalesce(sum(amount),0) into paid from public.invoice_payments where invoice_id=i.id;
 if i.status='paid' and paid=0 then raise exception 'This legacy invoice is already paid.'; end if;
 if p_amount is null or p_amount<=0 or p_amount<>round(p_amount,2) or p_date is null or p_date>current_date or p_method not in ('cash','bank_transfer','card','other') then raise exception 'Enter a valid amount, payment date and method.'; end if;
 if p_amount>total-paid then raise exception 'Payment exceeds the remaining balance.'; end if;
 insert into public.invoice_payments(garage_id,invoice_id,amount,paid_on,method,reference) values(i.garage_id,i.id,p_amount,p_date,p_method,p_reference) returning id into result;
 update public.invoices set status=case when paid+p_amount>=total then 'paid'::public.invoice_status when due_date<current_date then 'overdue'::public.invoice_status else 'sent'::public.invoice_status end where id=i.id;
 return result;
end $$;
revoke all on function private.record_payment(uuid,numeric,date,text,text) from public;
grant execute on function private.record_payment(uuid,numeric,date,text,text) to authenticated;
create function public.record_invoice_payment(p_invoice uuid,p_amount numeric,p_date date,p_method text,p_reference text default null)
returns uuid language sql security invoker set search_path='' as $$ select private.record_payment(p_invoice,p_amount,p_date,p_method,p_reference); $$;
revoke all on function public.record_invoice_payment(uuid,numeric,date,text,text) from public;
grant execute on function public.record_invoice_payment(uuid,numeric,date,text,text) to authenticated;
-- Preserve paid historical invoices without inventing a historic payment date.

create or replace function private.validate_booking()
returns trigger language plpgsql security definer set search_path='' as $$
declare conflict_id uuid; tz text; begin
 if not exists(select 1 from public.customers where id=new.customer_id and garage_id=new.garage_id and not archived) then raise exception 'Choose an active customer from this garage.'; end if;
 if new.vehicle_id is not null and not exists(select 1 from public.vehicles where id=new.vehicle_id and customer_id=new.customer_id and garage_id=new.garage_id) then raise exception 'Choose a vehicle belonging to this customer.'; end if;
 if new.time is not null then
 if new.duration_minutes is null or new.duration_minutes<1 or new.duration_minutes>1440 then raise exception 'Duration must be between 1 and 1440 minutes.'; end if;
 select timezone into tz from public.garage_settings where id=new.garage_id;
 new.starts_at=(new.date+new.time) at time zone coalesce(tz,'Europe/London'); new.ends_at=new.starts_at+make_interval(mins=>new.duration_minutes);
 perform pg_advisory_xact_lock(hashtextextended(new.garage_id::text,0));
 select id into conflict_id from public.bookings b where b.garage_id=new.garage_id and b.id<>new.id
 and b.status not in ('cancelled','no_show') and new.status not in ('cancelled','no_show')
 and b.time is not null
 and tsrange(b.date+b.time,b.date+b.time+make_interval(mins=>coalesce(b.duration_minutes,60)),'[)') && tsrange(new.date+new.time,new.date+new.time+make_interval(mins=>new.duration_minutes),'[)')
 and ((nullif(trim(new.technician),'') is not null and lower(trim(b.technician))=lower(trim(new.technician))) or (nullif(trim(new.bay),'') is not null and lower(trim(b.bay))=lower(trim(new.bay)))) limit 1;
 if conflict_id is not null then raise exception 'This technician or bay is already booked at that time.'; end if;
 end if; return new;
end $$;
revoke all on function private.validate_booking() from public;
create trigger validate_workflow_booking before insert or update on public.bookings for each row execute function private.validate_booking();
create or replace function private.create_booking(p_garage uuid,p_customer uuid,p_vehicle uuid,p_type public.job_type,p_date date,p_time time,p_duration integer,p_price numeric,p_priority text,p_technician text,p_bay text,p_notes text,p_details jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare b uuid; begin
 if not private.has_permission(p_garage,'bookings.manage') then raise exception 'Booking permission required.'; end if;
 if p_time is null or p_date is null or p_vehicle is null then raise exception 'Select a vehicle, date and time.'; end if;
 if p_price<0 then raise exception 'Price cannot be negative.'; end if;
 insert into public.bookings(garage_id,customer_id,vehicle_id,job_type,date,time,duration_minutes,est_price,technician,bay,notes,service_details)
 values(p_garage,p_customer,p_vehicle,p_type,p_date,p_time,p_duration,p_price,nullif(trim(p_technician),''),nullif(trim(p_bay),''),p_notes,p_details) returning id into b;
 insert into public.job_cards(garage_id,booking_id,customer_id,vehicle_id,status,priority,technician,description,due_date,notes)
 values(p_garage,b,p_customer,p_vehicle,'booked',p_priority,nullif(trim(p_technician),''),replace(p_type::text,'_',' '),p_date,p_notes);
 return b;
end $$;
revoke all on function private.create_booking(uuid,uuid,uuid,public.job_type,date,time,integer,numeric,text,text,text,text,jsonb) from public;
grant execute on function private.create_booking(uuid,uuid,uuid,public.job_type,date,time,integer,numeric,text,text,text,text,jsonb) to authenticated;
create function public.create_workshop_booking(p_garage uuid,p_customer uuid,p_vehicle uuid,p_type public.job_type,p_date date,p_time time,p_duration integer,p_price numeric,p_priority text,p_technician text,p_bay text,p_notes text,p_details jsonb)
returns uuid language sql security invoker set search_path='' as $$ select private.create_booking(p_garage,p_customer,p_vehicle,p_type,p_date,p_time,p_duration,p_price,p_priority,p_technician,p_bay,p_notes,p_details); $$;
revoke all on function public.create_workshop_booking(uuid,uuid,uuid,public.job_type,date,time,integer,numeric,text,text,text,text,jsonb) from public;
grant execute on function public.create_workshop_booking(uuid,uuid,uuid,public.job_type,date,time,integer,numeric,text,text,text,text,jsonb) to authenticated;

-- Stock consumption lives in a trigger so all write paths stay consistent.
create or replace function private.job_part_stock()
returns trigger language plpgsql security definer set search_path='' as $$
declare p public.parts; g uuid; j uuid; begin
 g=case when tg_op='DELETE' then old.garage_id else new.garage_id end;
 j=case when tg_op='DELETE' then old.job_id else new.job_id end;
 if auth.uid() is not null and not (private.has_permission(g,'jobs.manage') or private.has_permission(g,'jobs.update')) then raise exception 'Job permission required.'; end if;
 if tg_op<>'DELETE' and not exists(select 1 from public.job_cards where id=j and garage_id=g) then raise exception 'Job does not belong to this garage.'; end if;
 if exists(select 1 from public.invoices where job_id=j) then raise exception 'This job has an invoice. Its parts cannot be changed.'; end if;
 -- Lock parts in deterministic order before returning/consuming stock.
 perform id from public.parts where id in (case when tg_op<>'INSERT' then old.part_id end,case when tg_op<>'DELETE' then new.part_id end) order by id for update;
 if tg_op<>'INSERT' and old.stock_consumed and old.part_id is not null then update public.parts set stock_level=stock_level+old.quantity where id=old.part_id and garage_id=old.garage_id; end if;
 if tg_op='DELETE' then return old; end if;
 if new.quantity<=0 or new.unit_price<0 then raise exception 'Part quantity must be positive and price cannot be negative.'; end if;
 if new.part_id is not null then
 select * into p from public.parts where id=new.part_id and garage_id=g for update;
 if not found then raise exception 'Part does not belong to this garage.'; end if;
 if p.stock_level<new.quantity then raise exception 'Not enough stock for %.',p.name; end if;
 update public.parts set stock_level=stock_level-new.quantity where id=p.id;
 new.cost_price=case when tg_op='UPDATE' and old.part_id=new.part_id then old.cost_price else p.cost_price end;
 new.stock_consumed=true;
 else new.cost_price=coalesce(new.cost_price,0);new.stock_consumed=false; end if;
 return new;
end $$;
revoke all on function private.job_part_stock() from public;
create trigger job_part_stock before insert or update or delete on public.job_part_lines for each row execute function private.job_part_stock();
-- Atomic replacement prevents lost lines when a stock or validation check fails.
create or replace function private.save_job_lines(p_job uuid,p_labour jsonb,p_parts jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare j public.job_cards; l jsonb; old_line uuid; kept uuid[] := array[]::uuid[]; begin
 select * into j from public.job_cards where id=p_job for update;
 if not found or not (private.has_permission(j.garage_id,'jobs.manage') or private.has_permission(j.garage_id,'jobs.update')) then raise exception 'Job permission required.'; end if;
 if exists(select 1 from public.invoices where job_id=j.id) then raise exception 'An invoiced job cannot be changed.'; end if;
 if jsonb_typeof(p_labour)<>'array' or jsonb_typeof(p_parts)<>'array' then raise exception 'Invalid job lines.'; end if;
 delete from public.job_labour_lines where job_id=j.id;
 for l in select * from jsonb_array_elements(p_labour) loop
 if coalesce(trim(l->>'description'),'')='' or (l->>'hours')::numeric<0 or (l->>'rate')::numeric<0 then raise exception 'Enter valid labour details.'; end if;
 insert into public.job_labour_lines(garage_id,job_id,description,hours,rate) values(j.garage_id,j.id,l->>'description',(l->>'hours')::numeric,(l->>'rate')::numeric); end loop;
 for l in select * from jsonb_array_elements(p_parts) loop
 old_line=null;
 select id into old_line from public.job_part_lines where job_id=j.id and part_id is not distinct from nullif(l->>'partId','')::uuid and not(id=any(kept)) order by id limit 1;
 if old_line is null then
 insert into public.job_part_lines(garage_id,job_id,part_id,description,quantity,unit_price) values(j.garage_id,j.id,nullif(l->>'partId','')::uuid,l->>'description',(l->>'quantity')::integer,(l->>'unitPrice')::numeric) returning id into old_line;
 else update public.job_part_lines set description=l->>'description',quantity=(l->>'quantity')::integer,unit_price=(l->>'unitPrice')::numeric where id=old_line; end if;
 kept=array_append(kept,old_line);
 end loop;
 delete from public.job_part_lines where job_id=j.id and not(id=any(kept));
end $$;
revoke all on function private.save_job_lines(uuid,jsonb,jsonb) from public;
grant execute on function private.save_job_lines(uuid,jsonb,jsonb) to authenticated;
create function public.save_workshop_job_lines(p_job uuid,p_labour jsonb,p_parts jsonb) returns void language sql security invoker set search_path='' as $$ select private.save_job_lines(p_job,p_labour,p_parts); $$;
revoke all on function public.save_workshop_job_lines(uuid,jsonb,jsonb) from public;
grant execute on function public.save_workshop_job_lines(uuid,jsonb,jsonb) to authenticated;

create or replace function private.invoice_from_job(p_job uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare j public.job_cards; i uuid; vat_rate_value numeric; begin
 select * into j from public.job_cards where id=p_job for update;
 if not found or not private.has_permission(j.garage_id,'invoices.manage') then raise exception 'Invoice permission required.'; end if;
 select id into i from public.invoices where job_id=j.id limit 1;
 if i is not null then return i; end if;
 if j.vehicle_id is null then raise exception 'Assign a vehicle before creating an invoice.'; end if;
 if not exists(select 1 from public.job_labour_lines where job_id=j.id) and not exists(select 1 from public.job_part_lines where job_id=j.id) then raise exception 'Add labour or parts before creating an invoice.'; end if;
 select default_vat_rate into vat_rate_value from public.garage_settings where id=j.garage_id;
 insert into public.invoices(garage_id,customer_id,vehicle_id,job_id,date,due_date,status,vat_rate,notes) values(j.garage_id,j.customer_id,j.vehicle_id,j.id,current_date,current_date+14,'draft',vat_rate_value,j.notes) returning id into i;
 insert into public.invoice_line_items(garage_id,invoice_id,description,quantity,unit_price)
 select j.garage_id,i,description,hours,rate from public.job_labour_lines where job_id=j.id
 union all select j.garage_id,i,description,quantity,unit_price from public.job_part_lines where job_id=j.id;
 update public.job_cards set status='invoiced' where id=j.id;
 return i;
end $$;
revoke all on function private.invoice_from_job(uuid) from public;
grant execute on function private.invoice_from_job(uuid) to authenticated;
create function public.create_invoice_from_job(p_job uuid) returns uuid language sql security invoker set search_path='' as $$ select private.invoice_from_job(p_job); $$;
revoke all on function public.create_invoice_from_job(uuid) from public;
grant execute on function public.create_invoice_from_job(uuid) to authenticated;

-- Do not let manual status edits bypass the payment ledger.
create function private.guard_paid_invoice() returns trigger language plpgsql security definer set search_path='' as $$
declare total numeric; paid numeric; begin
 if tg_op='INSERT' and new.status='paid' then raise exception 'Record a payment to mark an invoice paid.'; end if;
 if tg_op='UPDATE' and new.status='paid' and old.status<>'paid' then
 select round(coalesce(sum(quantity*unit_price),0)*(1+new.vat_rate/100),2) into total from public.invoice_line_items where invoice_id=new.id;
 select coalesce(sum(amount),0) into paid from public.invoice_payments where invoice_id=new.id;
 if paid<total or paid=0 then raise exception 'Record the full payment to mark an invoice paid.'; end if; end if;
 if tg_op='UPDATE' and (old.status='paid' or exists(select 1 from public.invoice_payments where invoice_id=old.id)) and
 (new.customer_id is distinct from old.customer_id or new.vehicle_id is distinct from old.vehicle_id or new.vat_rate is distinct from old.vat_rate or (new.status='estimate')) then raise exception 'Payment-recorded invoices cannot change customer, vehicle or VAT.'; end if;
 return new; end $$;
revoke all on function private.guard_paid_invoice() from public;
create trigger guard_paid_invoice before insert or update on public.invoices for each row execute function private.guard_paid_invoice();

create function private.guard_invoice_lines() returns trigger language plpgsql security definer set search_path='' as $$
declare i public.invoices; invoice_id uuid; begin
 invoice_id=case when tg_op='DELETE' then old.invoice_id else new.invoice_id end;
 select * into i from public.invoices where id=invoice_id for update;
 if i.status='paid' or exists(select 1 from public.invoice_payments p where p.invoice_id=i.id) then raise exception 'An invoice with payments cannot change its items.'; end if;
 if tg_op<>'DELETE' then
 if new.garage_id<>i.garage_id or new.quantity<=0 or new.unit_price<0 or trim(new.description)='' then raise exception 'Enter valid invoice items.'; end if;
 return new; end if; return old;
end $$;
revoke all on function private.guard_invoice_lines() from public;
create trigger guard_invoice_lines before insert or update or delete on public.invoice_line_items for each row execute function private.guard_invoice_lines();

-- Automatic reminders: daily queue and authenticated sender with retry-safe claims.
alter table public.garage_settings add column automatic_reminders boolean not null default false;
alter table public.garage_settings add column reminder_days_before integer not null default 14 check(reminder_days_before between 0 and 90);
alter table public.garage_settings add column service_interval_months integer not null default 12 check(service_interval_months between 1 and 60);
alter table public.reminders add column delivery_channel text not null default 'none' check(delivery_channel in ('none','email'));
alter table public.reminders add column delivery_status text not null default 'not_requested';
create table public.reminder_outbox (
 id uuid primary key default gen_random_uuid(),garage_id uuid not null references public.garage_settings(id),
 customer_id uuid not null references public.customers(id),reminder_id uuid references public.reminders(id) on delete set null,
 recipient text not null,subject text not null,body text not null,dedupe_key text not null unique,
 status text not null default 'pending' check(status in ('pending','sending','sent','failed','skipped')),
 attempts integer not null default 0,last_error text,sent_at timestamptz,claimed_at timestamptz,created_at timestamptz not null default now());
alter table public.reminder_outbox enable row level security;
create index reminder_outbox_claim_idx on public.reminder_outbox(status,created_at);
create index reminder_outbox_garage_idx on public.reminder_outbox(garage_id);
create policy reminder_delivery_read on public.reminder_outbox for select to authenticated using(private.has_permission(garage_id,'reminders.manage'));
grant select on public.reminder_outbox to authenticated;
create function private.queue_reminders(p_garage uuid default null) returns integer language plpgsql security definer set search_path='' as $$
declare v record;r record;cnt integer:=0;n integer;due date;today date; begin
 if p_garage is not null and auth.role()<>'service_role' and not private.has_permission(p_garage,'reminders.manage') then raise exception 'Reminder permission required.'; end if;
 if p_garage is null and coalesce(auth.role(),'') in ('anon','authenticated') then raise exception 'Scheduler access required.'; end if;
 for v in select v.*,c.email,c.full_name,g.garage_name,g.reminder_days_before,g.service_interval_months,g.timezone from public.vehicles v join public.customers c on c.id=v.customer_id and c.garage_id=v.garage_id join public.garage_settings g on g.id=v.garage_id where g.automatic_reminders and c.email_opt_in and not c.archived and c.email<>'' and (p_garage is null or g.id=p_garage) loop
 today=(now() at time zone v.timezone)::date;
 for r in select 'MOT' as kind,v.mot_due as due union all select 'Service',(v.last_service_date+make_interval(months=>v.service_interval_months))::date loop
 due=r.due;
 if due between today and today+v.reminder_days_before then
 insert into public.reminder_outbox(garage_id,customer_id,recipient,subject,body,dedupe_key) values(v.garage_id,v.customer_id,v.email,r.kind||' reminder for '||v.registration,
 'Hello '||v.full_name||', your vehicle '||v.registration||' is due for '||lower(r.kind)||' on '||due||'. Please contact '||v.garage_name||' to book.',v.garage_id||':'||v.id||':'||r.kind||':'||due) on conflict(dedupe_key) do nothing;
 get diagnostics n=row_count;cnt=cnt+n;
 end if;end loop;end loop;
 for r in select r.*,c.email,c.full_name,g.garage_name,g.timezone from public.reminders r join public.customers c on c.id=r.customer_id and c.garage_id=r.garage_id join public.garage_settings g on g.id=r.garage_id where r.delivery_channel='email' and not r.done and c.email_opt_in and not c.archived and c.email<>'' and r.due_date<=(now() at time zone g.timezone)::date and (p_garage is null or r.garage_id=p_garage) loop
 insert into public.reminder_outbox(garage_id,customer_id,reminder_id,recipient,subject,body,dedupe_key) values(r.garage_id,r.customer_id,r.id,r.email,r.title,'Hello '||r.full_name||', '||r.title||'. Please contact '||r.garage_name||' for details.','manual:'||r.id||':'||r.due_date) on conflict(dedupe_key) do nothing;
 get diagnostics n=row_count;cnt=cnt+n;
 end loop;return cnt;
end $$;
revoke all on function private.queue_reminders(uuid) from public;
grant execute on function private.queue_reminders(uuid) to authenticated,service_role;
create function public.queue_garage_reminders(p_garage uuid) returns integer language sql security invoker set search_path='' as $$ select private.queue_reminders(p_garage); $$;
revoke all on function public.queue_garage_reminders(uuid) from public;
grant execute on function public.queue_garage_reminders(uuid) to authenticated,service_role;

create table private.reminder_worker_credentials(token_hash text primary key);
revoke all on private.reminder_worker_credentials from public,anon,authenticated;
create function private.worker_authorized(p_token text,p_garage uuid) returns boolean language sql security definer set search_path='' as $$
 select auth.role()='service_role' or (p_garage is not null and private.has_permission(p_garage,'reminders.manage')) or exists(select 1 from private.reminder_worker_credentials where token_hash=encode(extensions.digest(coalesce(p_token,''),'sha256'),'hex'));
$$;
revoke all on function private.worker_authorized(text,uuid) from public;
create function private.claim_reminders(p_token text,p_garage uuid) returns setof public.reminder_outbox language plpgsql security definer set search_path='' as $$
begin
 if not private.worker_authorized(p_token,p_garage) then raise exception 'Unauthorized worker.'; end if;
 return query with batch as (select o.id from public.reminder_outbox o join public.customers c on c.id=o.customer_id where c.email_opt_in and not c.archived and (p_garage is null or o.garage_id=p_garage) and o.attempts<5 and (o.status in ('pending','failed') or (o.status='sending' and o.claimed_at<now()-interval '10 minutes')) order by o.created_at limit 20 for update of o skip locked)
 update public.reminder_outbox o set status='sending',claimed_at=now(),attempts=o.attempts+1 where o.id in(select id from batch) returning o.*;
end $$;
revoke all on function private.claim_reminders(text,uuid) from public;
grant usage on schema private to anon,service_role;
grant execute on function private.claim_reminders(text,uuid) to anon,authenticated,service_role;
create function public.claim_reminder_delivery(p_token text default null,p_garage uuid default null) returns setof public.reminder_outbox language sql security invoker set search_path='' as $$ select * from private.claim_reminders(p_token,p_garage); $$;
revoke all on function public.claim_reminder_delivery(text,uuid) from public;
grant execute on function public.claim_reminder_delivery(text,uuid) to anon,authenticated,service_role;
create function private.finish_reminder(p_id uuid,p_token text,p_success boolean,p_error text) returns void language plpgsql security definer set search_path='' as $$
declare o public.reminder_outbox;begin
 select * into o from public.reminder_outbox where id=p_id for update;
 if not found or not private.worker_authorized(p_token,o.garage_id) then raise exception 'Unauthorized worker.'; end if;
 update public.reminder_outbox set status=case when p_success then 'sent' else 'failed' end,sent_at=case when p_success then now() else null end,last_error=left(p_error,500) where id=p_id;
 if o.reminder_id is not null then update public.reminders set delivery_status=case when p_success then 'sent' else 'failed' end where id=o.reminder_id; end if;
end $$;
revoke all on function private.finish_reminder(uuid,text,boolean,text) from public;
grant execute on function private.finish_reminder(uuid,text,boolean,text) to anon,authenticated,service_role;
create function public.finish_reminder_delivery(p_id uuid,p_token text,p_success boolean,p_error text default null) returns void language sql security invoker set search_path='' as $$ select private.finish_reminder(p_id,p_token,p_success,p_error); $$;
revoke all on function public.finish_reminder_delivery(uuid,text,boolean,text) from public;
grant execute on function public.finish_reminder_delivery(uuid,text,boolean,text) to anon,authenticated,service_role;

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
-- Scheduler secret is generated in the database, never committed or returned.
do $$ declare token text:=encode(extensions.gen_random_bytes(32),'hex'); command text; begin
 insert into private.reminder_worker_credentials values(encode(extensions.digest(token,'sha256'),'hex'));
 perform cron.schedule('garage-reminders-queue','0 7 * * *','select private.queue_reminders(null);');
 command=format($q$select net.http_post(url:='https://ykqktblqipgpxpdwmjkd.supabase.co/functions/v1/deliver-garage-reminders',headers:=jsonb_build_object('Content-Type','application/json','x-worker-key',%L),body:='{}'::jsonb);$q$,token);
 perform cron.schedule('garage-reminders-send','*/15 * * * *',command);
end $$;
