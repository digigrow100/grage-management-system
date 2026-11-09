-- A job's part trigger already changes inventory. Keep its ledger entries
-- for audit history without applying the same movement to stock twice.
create or replace function public.apply_stock_movement()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.reference_type is distinct from 'job' then
    update public.parts
    set stock_level = stock_level + new.quantity, updated_at = now()
    where id = new.part_id and garage_id = new.garage_id;
  end if;
  return new;
end;
$$;

-- Reuse the existing invoice transaction and add the job links to it.
create function public.save_garage_invoice(
  p_garage uuid, p_id uuid, p_input jsonb, p_job_ids uuid[] default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved_id uuid;
begin
  saved_id := private.save_invoice(p_garage, p_id, p_input);

  if p_id is null and cardinality(p_job_ids) > 0 then
    if exists (
      select 1 from unnest(p_job_ids) as selected(job_id)
      left join public.job_cards j on j.id = selected.job_id
        and j.garage_id = p_garage and j.customer_id = (p_input->>'customerId')::uuid
      where j.id is null
    ) then
      raise exception 'All selected jobs must belong to the invoice customer and garage.';
    end if;
    insert into public.invoice_jobs (garage_id, invoice_id, job_id)
    select distinct p_garage, saved_id, j from unnest(p_job_ids) j;
  end if;
  return saved_id;
end;
$$;

revoke execute on function public.save_garage_invoice(uuid,uuid,jsonb,uuid[]) from public, anon;
grant execute on function public.save_garage_invoice(uuid,uuid,jsonb,uuid[]) to authenticated;

alter policy invoice_jobs_insert on public.invoice_jobs
  with check (
    private.has_permission(garage_id, 'invoices.manage')
    and exists (
      select 1 from public.invoices i join public.job_cards j on j.customer_id = i.customer_id
      where i.id = invoice_id and j.id = invoice_jobs.job_id
        and i.garage_id = invoice_jobs.garage_id and j.garage_id = invoice_jobs.garage_id
    )
  );
alter policy invoice_jobs_delete on public.invoice_jobs
  using (private.has_permission(garage_id, 'invoices.manage'));
