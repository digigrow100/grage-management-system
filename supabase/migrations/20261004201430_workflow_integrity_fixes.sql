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
 insert into public.job_part_lines(garage_id,job_id,part_id,description,quantity,unit_price,cost_price) values(j.garage_id,j.id,nullif(l->>'partId','')::uuid,l->>'description',(l->>'quantity')::integer,(l->>'unitPrice')::numeric,coalesce((l->>'costPrice')::numeric,0)) returning id into old_line;
 else update public.job_part_lines set description=l->>'description',quantity=(l->>'quantity')::integer,unit_price=(l->>'unitPrice')::numeric,cost_price=case when part_id is null then coalesce((l->>'costPrice')::numeric,0) else cost_price end where id=old_line; end if;
 kept=array_append(kept,old_line);
 end loop;
 delete from public.job_part_lines where job_id=j.id and not(id=any(kept));
end $$;
create or replace function private.guard_paid_invoice() returns trigger language plpgsql security definer set search_path='' as $$
declare total numeric; paid numeric; begin
 if tg_op='INSERT' and new.status='paid' then raise exception 'Record a payment to mark an invoice paid.'; end if;
 if tg_op='UPDATE' and new.status='paid' and old.status<>'paid' then
 select round(coalesce(sum(quantity*unit_price),0)*(1+new.vat_rate/100),2) into total from public.invoice_line_items where invoice_id=new.id;
 select coalesce(sum(amount),0) into paid from public.invoice_payments where invoice_id=new.id;
 if paid<total or paid=0 then raise exception 'Record the full payment to mark an invoice paid.'; end if; end if;
 if tg_op='UPDATE' and (old.status='paid' or exists(select 1 from public.invoice_payments where invoice_id=old.id)) and
 (new.customer_id is distinct from old.customer_id or new.vehicle_id is distinct from old.vehicle_id or new.vat_rate is distinct from old.vat_rate or (new.status='estimate')) then raise exception 'Payment-recorded invoices cannot change customer, vehicle or VAT.'; end if;
 if tg_op='UPDATE' and old.status='paid' and new.status<>'paid' then raise exception 'Paid invoices cannot be reopened.'; end if;
 return new; end $$;

create function private.validate_workflow_links() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_table_name in ('vehicles','job_cards','invoices','reminders') and new.customer_id is not null and not exists(select 1 from public.customers where id=new.customer_id and garage_id=new.garage_id) then raise exception 'Customer belongs to another garage.'; end if;
 if tg_table_name in ('job_cards','invoices','reminders') then
 if new.vehicle_id is not null and not exists(select 1 from public.vehicles where id=new.vehicle_id and garage_id=new.garage_id and customer_id=new.customer_id) then raise exception 'Vehicle must belong to the selected customer.'; end if;
 end if;
 if tg_table_name='job_cards' and tg_op='UPDATE' then
 if (new.customer_id is distinct from old.customer_id or new.vehicle_id is distinct from old.vehicle_id) and exists(select 1 from public.invoices where job_id=old.id) then raise exception 'Invoiced job links cannot change.'; end if;
 end if;
 return new;
end $$;
revoke all on function private.validate_workflow_links() from public;
create trigger validate_vehicle_links before insert or update on public.vehicles for each row execute function private.validate_workflow_links();
create trigger validate_job_links before insert or update on public.job_cards for each row execute function private.validate_workflow_links();
create trigger validate_invoice_links before insert or update on public.invoices for each row execute function private.validate_workflow_links();
create trigger validate_reminder_links before insert or update on public.reminders for each row execute function private.validate_workflow_links();
alter table public.job_part_lines add constraint job_part_nonnegative_cost check(cost_price>=0);
