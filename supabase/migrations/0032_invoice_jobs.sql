-- Phase 4d: Batch invoicing — combine multiple completed jobs for one
-- customer into a single invoice.
--
-- invoices.job_id (added 0004) is left untouched: it caps an invoice at a
-- single job and, per a live check against production, has zero non-null
-- rows — nothing in the app ever writes it (addInvoice/updateInvoice never
-- set it; the only write site is deleteJobCard() defensively nulling it
-- out). Rather than repurpose that dead column, this adds a proper
-- many-to-many join table so one invoice can cover several jobs.

create table if not exists invoice_jobs (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid not null references garage_settings(id) on delete cascade,
  invoice_id uuid not null references invoices(id) on delete cascade,
  job_id uuid not null references job_cards(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint invoice_jobs_unique unique (invoice_id, job_id)
);

alter table invoice_jobs enable row level security;

drop policy if exists "invoice_jobs_select" on invoice_jobs;
create policy "invoice_jobs_select" on invoice_jobs for select to authenticated using (is_garage_member(garage_id));
drop policy if exists "invoice_jobs_insert" on invoice_jobs;
create policy "invoice_jobs_insert" on invoice_jobs for insert to authenticated with check (is_garage_member(garage_id));
drop policy if exists "invoice_jobs_delete" on invoice_jobs;
create policy "invoice_jobs_delete" on invoice_jobs for delete to authenticated using (is_garage_member(garage_id));

create index if not exists invoice_jobs_invoice_idx on invoice_jobs(invoice_id);
create index if not exists invoice_jobs_job_idx on invoice_jobs(job_id);
