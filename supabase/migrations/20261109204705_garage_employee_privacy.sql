-- Permit staff to request and cancel only their own leave.
alter policy employee_leave_insert on public.employee_leave
  with check (
    (select auth.uid()) = requested_by
    and status = 'requested' and approved_by is null and decided_at is null
    and exists (
      select 1 from public.employees e
      where e.id = employee_id and e.garage_id = employee_leave.garage_id
        and (e.user_id = (select auth.uid()) or private.has_permission(e.garage_id, 'employees.manage'))
    )
  );

alter policy employee_leave_select on public.employee_leave
  using (
    private.has_permission(garage_id, 'employees.manage')
    or (public.is_garage_member(garage_id) and requested_by = (select auth.uid()))
  );

alter policy employee_leave_update on public.employee_leave
  using (
    private.has_permission(garage_id, 'employees.manage')
    or (public.is_garage_member(garage_id) and requested_by = (select auth.uid()))
  )
  with check (
    private.has_permission(garage_id, 'employees.manage')
    or (public.is_garage_member(garage_id) and requested_by = (select auth.uid()) and status = 'cancelled')
  );

create function private.guard_own_leave_cancellation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null and not private.has_permission(old.garage_id, 'employees.manage') and (
    old.status not in ('requested', 'approved') or new.status <> 'cancelled'
    or (to_jsonb(new) - 'status' - 'updated_at') <> (to_jsonb(old) - 'status' - 'updated_at')
  ) then
    raise exception 'Staff can only cancel their own open leave request.' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke execute on function private.guard_own_leave_cancellation() from public, anon, authenticated;
create trigger guard_own_leave_cancellation
before update on public.employee_leave
for each row execute function private.guard_own_leave_cancellation();

-- Booking and job screens need a staff directory. Pay and personal contact
-- details are available only to roles that manage employees.
create function public.list_garage_employees(p_garage uuid)
returns setof public.employees
language sql
stable
security definer
set search_path = ''
as $$
  select (case when access.can_manage then e
    else jsonb_populate_record(e, '{"hourly_rate":0,"email":null,"phone":null}'::jsonb)
  end).*
  from public.employees e
  cross join (select private.has_permission(p_garage, 'employees.manage') as can_manage) access
  where e.garage_id = p_garage and (
    access.can_manage
    or private.has_permission(p_garage, 'employees.view')
    or private.has_permission(p_garage, 'jobs.view')
    or private.has_permission(p_garage, 'jobs.manage')
    or private.has_permission(p_garage, 'bookings.manage')
  )
  order by e.full_name;
$$;

revoke execute on function public.list_garage_employees(uuid) from public, anon;
grant execute on function public.list_garage_employees(uuid) to authenticated;
