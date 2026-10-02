-- Team members, custom roles and permissions.
-- Keeps the existing garage_members.role column for backwards compatibility,
-- while adding role_id for custom roles.

create schema if not exists private;
grant usage on schema private to authenticated;

alter table public.garage_members
  drop constraint if exists garage_members_role_check;

alter table public.garage_members
  add column if not exists role_id uuid,
  add column if not exists email text;

create table if not exists public.garage_roles (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid not null references public.garage_settings(id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  permissions text[] not null default '{}',
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (garage_id, slug)
);

create unique index if not exists garage_roles_name_ci_key
  on public.garage_roles (garage_id, lower(name));

alter table public.garage_roles enable row level security;

create table if not exists public.garage_invites (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid not null references public.garage_settings(id) on delete cascade,
  email text not null,
  role_id uuid not null references public.garage_roles(id) on delete restrict,
  invited_by uuid not null references auth.users(id) on delete cascade,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (garage_id, email)
);

alter table public.garage_invites enable row level security;

create or replace function private.can_manage_team(target_garage_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.garage_members gm
    where gm.garage_id = target_garage_id
      and gm.user_id = (select auth.uid())
      and gm.role in ('owner', 'admin')
  );
$$;

revoke all on function private.can_manage_team(uuid) from public;
grant execute on function private.can_manage_team(uuid) to authenticated;

create or replace function private.seed_default_garage_roles()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.garage_roles (garage_id, name, slug, description, permissions, is_system)
  values
    (new.id, 'Owner', 'owner', 'Full access to the garage and account ownership.', array['*']::text[], true),
    (new.id, 'Admin', 'admin', 'Full operational access, including team and role management.', array['*']::text[], true),
    (new.id, 'Manager', 'manager', 'Manage daily garage operations.', array['dashboard.view','customers.manage','bookings.manage','jobs.manage','invoices.manage','inventory.manage','reminders.manage','reports.view','employees.manage']::text[], true),
    (new.id, 'Service Advisor', 'service_advisor', 'Manage customers, bookings, jobs and estimates.', array['dashboard.view','customers.manage','bookings.manage','jobs.manage','invoices.view','inventory.view']::text[], true),
    (new.id, 'Technician', 'technician', 'View and update assigned workshop work.', array['dashboard.view','jobs.view','jobs.update','inventory.view']::text[], true)
  on conflict (garage_id, slug) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_seed_default_garage_roles on public.garage_settings;
create trigger trg_seed_default_garage_roles
after insert on public.garage_settings
for each row execute function private.seed_default_garage_roles();

insert into public.garage_roles (garage_id, name, slug, description, permissions, is_system)
select g.id, r.name, r.slug, r.description, r.permissions, true
from public.garage_settings g
cross join (
  values
    ('Owner','owner','Full access to the garage and account ownership.',array['*']::text[]),
    ('Admin','admin','Full operational access, including team and role management.',array['*']::text[]),
    ('Manager','manager','Manage daily garage operations.',array['dashboard.view','customers.manage','bookings.manage','jobs.manage','invoices.manage','inventory.manage','reminders.manage','reports.view','employees.manage']::text[]),
    ('Service Advisor','service_advisor','Manage customers, bookings, jobs and estimates.',array['dashboard.view','customers.manage','bookings.manage','jobs.manage','invoices.view','inventory.view']::text[]),
    ('Technician','technician','View and update assigned workshop work.',array['dashboard.view','jobs.view','jobs.update','inventory.view']::text[])
) as r(name,slug,description,permissions)
on conflict (garage_id, slug) do nothing;

update public.garage_members gm
set role_id = gr.id
from public.garage_roles gr
where gr.garage_id = gm.garage_id
  and gr.slug = gm.role
  and gm.role_id is null;

update public.garage_members gm
set email = lower(u.email)
from auth.users u
where u.id = gm.user_id
  and gm.email is null;

alter table public.garage_members
  add constraint garage_members_role_id_fkey
  foreign key (role_id) references public.garage_roles(id) on delete restrict;

create or replace function private.sync_garage_member_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_role public.garage_roles%rowtype;
begin
  if new.role_id is null then
    select * into selected_role
    from public.garage_roles
    where garage_id = new.garage_id and slug = coalesce(new.role, 'owner')
    limit 1;

    if selected_role.id is null then
      select * into selected_role
      from public.garage_roles
      where garage_id = new.garage_id and slug = 'owner'
      limit 1;
    end if;

    new.role_id := selected_role.id;
  else
    select * into selected_role
    from public.garage_roles
    where id = new.role_id and garage_id = new.garage_id;

    if selected_role.id is null then
      raise exception 'Selected role does not belong to this garage';
    end if;
  end if;

  new.role := selected_role.slug;

  if new.email is null then
    select lower(email) into new.email from auth.users where id = new.user_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_garage_member_role on public.garage_members;
create trigger trg_sync_garage_member_role
before insert or update of role_id, role, user_id on public.garage_members
for each row execute function private.sync_garage_member_role();

create or replace function private.guard_last_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.role = 'owner' and (tg_op = 'DELETE' or new.role <> 'owner') then
    if (
      select count(*)
      from public.garage_members
      where garage_id = old.garage_id and role = 'owner' and id <> old.id
    ) = 0 then
      raise exception 'A garage must always have at least one owner';
    end if;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_guard_last_owner on public.garage_members;
create trigger trg_guard_last_owner
before update or delete on public.garage_members
for each row execute function private.guard_last_owner();

create or replace function private.apply_garage_invite()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  matched_user uuid;
  selected_slug text;
begin
  select id into matched_user
  from auth.users
  where lower(email) = lower(new.email)
  limit 1;

  select slug into selected_slug
  from public.garage_roles
  where id = new.role_id and garage_id = new.garage_id;

  if selected_slug is null then
    raise exception 'Invalid role for garage';
  end if;

  if matched_user is not null then
    insert into public.garage_members (garage_id, user_id, role_id, role, email)
    values (new.garage_id, matched_user, new.role_id, selected_slug, lower(new.email))
    on conflict (garage_id, user_id)
    do update set
      role_id = excluded.role_id,
      role = excluded.role,
      email = excluded.email;

    update public.garage_invites
    set accepted_at = coalesce(accepted_at, now())
    where id = new.id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_apply_garage_invite on public.garage_invites;
create trigger trg_apply_garage_invite
after insert or update of role_id on public.garage_invites
for each row execute function private.apply_garage_invite();

create or replace function private.accept_pending_garage_invites()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  inv record;
  selected_slug text;
begin
  if new.email is null then
    return new;
  end if;

  for inv in
    select gi.id, gi.garage_id, gi.role_id
    from public.garage_invites gi
    where lower(gi.email) = lower(new.email)
      and gi.accepted_at is null
  loop
    select slug into selected_slug
    from public.garage_roles
    where id = inv.role_id;

    insert into public.garage_members (garage_id, user_id, role_id, role, email)
    values (inv.garage_id, new.id, inv.role_id, selected_slug, lower(new.email))
    on conflict (garage_id, user_id)
    do update set
      role_id = excluded.role_id,
      role = excluded.role,
      email = excluded.email;

    update public.garage_invites set accepted_at = now() where id = inv.id;
  end loop;

  return new;
end;
$$;

drop trigger if exists trg_accept_pending_garage_invites on auth.users;
create trigger trg_accept_pending_garage_invites
after insert on auth.users
for each row execute function private.accept_pending_garage_invites();

drop policy if exists "garage_roles_select" on public.garage_roles;
create policy "garage_roles_select" on public.garage_roles
for select to authenticated
using ((select public.is_garage_member(garage_id)));

drop policy if exists "garage_roles_insert" on public.garage_roles;
create policy "garage_roles_insert" on public.garage_roles
for insert to authenticated
with check ((select private.can_manage_team(garage_id)));

drop policy if exists "garage_roles_update" on public.garage_roles;
create policy "garage_roles_update" on public.garage_roles
for update to authenticated
using ((select private.can_manage_team(garage_id)))
with check ((select private.can_manage_team(garage_id)));

drop policy if exists "garage_roles_delete" on public.garage_roles;
create policy "garage_roles_delete" on public.garage_roles
for delete to authenticated
using ((select private.can_manage_team(garage_id)) and not is_system);

drop policy if exists "garage_invites_select" on public.garage_invites;
create policy "garage_invites_select" on public.garage_invites
for select to authenticated
using ((select private.can_manage_team(garage_id)));

drop policy if exists "garage_invites_insert" on public.garage_invites;
create policy "garage_invites_insert" on public.garage_invites
for insert to authenticated
with check (
  (select private.can_manage_team(garage_id))
  and invited_by = (select auth.uid())
);

drop policy if exists "garage_invites_update" on public.garage_invites;
create policy "garage_invites_update" on public.garage_invites
for update to authenticated
using ((select private.can_manage_team(garage_id)))
with check ((select private.can_manage_team(garage_id)));

drop policy if exists "garage_invites_delete" on public.garage_invites;
create policy "garage_invites_delete" on public.garage_invites
for delete to authenticated
using ((select private.can_manage_team(garage_id)));

drop policy if exists "garage_members_select" on public.garage_members;
create policy "garage_members_select" on public.garage_members
for select to authenticated
using (
  user_id = (select auth.uid())
  or (select private.can_manage_team(garage_id))
);

drop policy if exists "garage_members_insert" on public.garage_members;
create policy "garage_members_insert" on public.garage_members
for insert to authenticated
with check ((select private.can_manage_team(garage_id)));

drop policy if exists "garage_members_update" on public.garage_members;
create policy "garage_members_update" on public.garage_members
for update to authenticated
using ((select private.can_manage_team(garage_id)))
with check ((select private.can_manage_team(garage_id)));

drop policy if exists "garage_members_delete" on public.garage_members;
create policy "garage_members_delete" on public.garage_members
for delete to authenticated
using ((select private.can_manage_team(garage_id)));

create index if not exists garage_members_role_id_idx on public.garage_members(role_id);
create index if not exists garage_roles_garage_id_idx on public.garage_roles(garage_id);
create index if not exists garage_invites_garage_id_idx on public.garage_invites(garage_id);
create index if not exists garage_invites_email_lower_idx on public.garage_invites(lower(email));
