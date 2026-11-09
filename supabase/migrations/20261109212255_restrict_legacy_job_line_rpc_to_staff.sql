revoke execute on function public.save_workshop_job_lines(uuid,jsonb,jsonb) from public,anon;
grant execute on function public.save_workshop_job_lines(uuid,jsonb,jsonb) to authenticated;
