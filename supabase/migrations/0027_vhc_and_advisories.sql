-- Phase 3d: Vehicle Health Check (VHC) + advisories.
-- Purely additive — no existing VHC/inspection concept exists anywhere in
-- the schema, so these are brand new tables with no naming collisions.

-- 1. Templates: a garage-defined checklist (e.g. "Standard VHC", "MOT prep")

create table if not exists vhc_templates (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid not null references garage_settings(id) on delete cascade,
  name text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table vhc_templates enable row level security;

drop policy if exists "vhc_templates_select" on vhc_templates;
create policy "vhc_templates_select" on vhc_templates for select to authenticated using (is_garage_member(garage_id));
drop policy if exists "vhc_templates_insert" on vhc_templates;
create policy "vhc_templates_insert" on vhc_templates for insert to authenticated with check (is_garage_member(garage_id));
drop policy if exists "vhc_templates_update" on vhc_templates;
create policy "vhc_templates_update" on vhc_templates for update to authenticated using (is_garage_member(garage_id)) with check (is_garage_member(garage_id));
drop policy if exists "vhc_templates_delete" on vhc_templates;
create policy "vhc_templates_delete" on vhc_templates for delete to authenticated using (is_garage_member(garage_id));

create unique index if not exists vhc_templates_garage_default_key
  on vhc_templates(garage_id) where is_default;

create table if not exists vhc_template_items (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid not null references garage_settings(id) on delete cascade,
  template_id uuid not null references vhc_templates(id) on delete cascade,
  category text not null default 'General',
  label text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table vhc_template_items enable row level security;

drop policy if exists "vhc_template_items_select" on vhc_template_items;
create policy "vhc_template_items_select" on vhc_template_items for select to authenticated using (is_garage_member(garage_id));
drop policy if exists "vhc_template_items_insert" on vhc_template_items;
create policy "vhc_template_items_insert" on vhc_template_items for insert to authenticated with check (is_garage_member(garage_id));
drop policy if exists "vhc_template_items_update" on vhc_template_items;
create policy "vhc_template_items_update" on vhc_template_items for update to authenticated using (is_garage_member(garage_id)) with check (is_garage_member(garage_id));
drop policy if exists "vhc_template_items_delete" on vhc_template_items;
create policy "vhc_template_items_delete" on vhc_template_items for delete to authenticated using (is_garage_member(garage_id));

create index if not exists vhc_template_items_template_idx on vhc_template_items(template_id, sort_order);

-- 2. Checks: one VHC performed against a job

create table if not exists vhc_checks (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid not null references garage_settings(id) on delete cascade,
  job_id uuid not null references job_cards(id) on delete cascade,
  template_id uuid references vhc_templates(id) on delete set null,
  status text not null default 'in_progress',
  technician_id uuid references employees(id) on delete set null,
  notes text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  sent_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vhc_checks_status_check check (status in ('in_progress', 'completed', 'sent'))
);

alter table vhc_checks enable row level security;

drop policy if exists "vhc_checks_select" on vhc_checks;
create policy "vhc_checks_select" on vhc_checks for select to authenticated using (is_garage_member(garage_id));
drop policy if exists "vhc_checks_insert" on vhc_checks;
create policy "vhc_checks_insert" on vhc_checks for insert to authenticated with check (is_garage_member(garage_id));
drop policy if exists "vhc_checks_update" on vhc_checks;
create policy "vhc_checks_update" on vhc_checks for update to authenticated using (is_garage_member(garage_id)) with check (is_garage_member(garage_id));
drop policy if exists "vhc_checks_delete" on vhc_checks;
create policy "vhc_checks_delete" on vhc_checks for delete to authenticated using (is_garage_member(garage_id));

create index if not exists vhc_checks_job_idx on vhc_checks(job_id);
create index if not exists vhc_checks_garage_status_idx on vhc_checks(garage_id, status, created_at desc);

-- 3. Items: individual checklist results within a check (the advisories)

create table if not exists vhc_items (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid not null references garage_settings(id) on delete cascade,
  vhc_check_id uuid not null references vhc_checks(id) on delete cascade,
  category text not null default 'General',
  label text not null,
  result text not null default 'not_checked',
  notes text,
  photo_paths text[] not null default '{}',
  estimate_line_id uuid references estimate_lines(id) on delete set null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vhc_items_result_check check (result in ('green', 'amber', 'red', 'not_checked', 'not_applicable'))
);

alter table vhc_items enable row level security;

drop policy if exists "vhc_items_select" on vhc_items;
create policy "vhc_items_select" on vhc_items for select to authenticated using (is_garage_member(garage_id));
drop policy if exists "vhc_items_insert" on vhc_items;
create policy "vhc_items_insert" on vhc_items for insert to authenticated with check (is_garage_member(garage_id));
drop policy if exists "vhc_items_update" on vhc_items;
create policy "vhc_items_update" on vhc_items for update to authenticated using (is_garage_member(garage_id)) with check (is_garage_member(garage_id));
drop policy if exists "vhc_items_delete" on vhc_items;
create policy "vhc_items_delete" on vhc_items for delete to authenticated using (is_garage_member(garage_id));

create index if not exists vhc_items_check_idx on vhc_items(vhc_check_id, sort_order);
create index if not exists vhc_items_garage_result_idx on vhc_items(garage_id, result);

-- 4. Storage bucket for VHC photos, path convention:
--    {garage_id}/{vhc_check_id}/{filename}
--    RLS mirrors is_garage_member() by reading the first path segment as
--    the garage_id, same tenant-scoping model as every other table here.

insert into storage.buckets (id, name, public)
values ('vhc-photos', 'vhc-photos', false)
on conflict (id) do nothing;

drop policy if exists "vhc_photos_select" on storage.objects;
create policy "vhc_photos_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'vhc-photos'
    and is_garage_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "vhc_photos_insert" on storage.objects;
create policy "vhc_photos_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'vhc-photos'
    and is_garage_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "vhc_photos_delete" on storage.objects;
create policy "vhc_photos_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'vhc-photos'
    and is_garage_member(((storage.foldername(name))[1])::uuid)
  );
