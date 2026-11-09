create or replace function private.write_job_lines(
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
    -- Return every old allocation before consuming the replacement set.
    -- This lets a full-stock job combine or reorder lines for the same part.
    perform private.save_job_lines(p_job,'[]','[]');
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

