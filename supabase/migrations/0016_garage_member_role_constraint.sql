-- Constrains garage_members.role to the permission roles defined in spec
-- section 10: owner, manager, service_advisor, technician. Every existing
-- row today is 'owner' (verified before writing this migration), but as a
-- safety net any row holding some other legacy value is remapped to
-- 'owner' first so this migration can never fail or lock someone out —
-- 'owner' is the most-permissive role, so no access is lost.
--
-- Run this once against the project's Postgres database (Supabase SQL
-- Editor, or `supabase db push`).

update garage_members
set role = 'owner'
where role not in ('owner', 'manager', 'service_advisor', 'technician');

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'garage_members_role_check') then
    alter table garage_members
      add constraint garage_members_role_check
      check (role in ('owner', 'manager', 'service_advisor', 'technician'));
  end if;
end $$;
