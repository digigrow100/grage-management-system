create function private.protect_paid_invoice_delete() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if old.status='paid' or exists(select 1 from public.invoice_payments where invoice_id=old.id) then raise exception 'Invoices with recorded payments cannot be deleted.';end if;
 return old;
end $$;
revoke all on function private.protect_paid_invoice_delete() from public;
create trigger protect_paid_invoice_delete before delete on public.invoices for each row execute function private.protect_paid_invoice_delete();
