create or replace function private.queue_reminders(p_garage uuid default null) returns integer language plpgsql security definer set search_path='' as $$
declare v record;r record;cnt integer:=0;n integer;due date;today date; begin
 if p_garage is not null and auth.role()<>'service_role' and not private.has_permission(p_garage,'reminders.manage') then raise exception 'Reminder permission required.'; end if;
 if p_garage is null and coalesce(auth.role(),'') in ('anon','authenticated') then raise exception 'Scheduler access required.'; end if;
 for v in select vh.*,c.email,c.full_name,g.garage_name,g.reminder_days_before,g.service_interval_months,g.timezone from public.vehicles vh join public.customers c on c.id=vh.customer_id and c.garage_id=vh.garage_id join public.garage_settings g on g.id=vh.garage_id where g.automatic_reminders and c.email_opt_in and not c.archived and c.email<>'' and (p_garage is null or g.id=p_garage) loop
 today=(now() at time zone v.timezone)::date;
 for r in select 'MOT' as kind,v.mot_due as due union all select 'Service',(v.last_service_date+make_interval(months=>v.service_interval_months))::date loop
 due=r.due;
 if due between today and today+v.reminder_days_before then
 insert into public.reminder_outbox(garage_id,customer_id,recipient,subject,body,dedupe_key) values(v.garage_id,v.customer_id,v.email,r.kind||' reminder for '||v.registration,
 'Hello '||v.full_name||', your vehicle '||v.registration||' is due for '||lower(r.kind)||' on '||due||'. Please contact '||v.garage_name||' to book.',v.garage_id||':'||v.id||':'||r.kind||':'||due) on conflict(dedupe_key) do nothing;
 get diagnostics n=row_count;cnt=cnt+n;
 end if;end loop;end loop;
 for r in select rem.*,c.email,c.full_name,g.garage_name,g.timezone from public.reminders rem join public.customers c on c.id=rem.customer_id and c.garage_id=rem.garage_id join public.garage_settings g on g.id=rem.garage_id where rem.delivery_channel='email' and not rem.done and c.email_opt_in and not c.archived and c.email<>'' and rem.due_date<=(now() at time zone g.timezone)::date and (p_garage is null or rem.garage_id=p_garage) loop
 insert into public.reminder_outbox(garage_id,customer_id,reminder_id,recipient,subject,body,dedupe_key) values(r.garage_id,r.customer_id,r.id,r.email,r.title,'Hello '||r.full_name||', '||r.title||'. Please contact '||r.garage_name||' for details.','manual:'||r.id||':'||r.due_date) on conflict(dedupe_key) do nothing;
 get diagnostics n=row_count;cnt=cnt+n;
 end loop;return cnt;
end $$;
