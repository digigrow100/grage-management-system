-- Save the invoice and its items together; payment recording locks the same row.
create function private.save_invoice(p_garage uuid,p_id uuid,p_input jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare i public.invoices;l jsonb;invoice_id uuid;begin
 if not private.has_permission(p_garage,'invoices.manage') then raise exception 'Invoice permission required.';end if;
 if jsonb_typeof(p_input->'lineItems')<>'array' or jsonb_array_length(p_input->'lineItems')=0 then raise exception 'Add at least one invoice item.';end if;
 if coalesce(p_input->>'status','draft') not in ('estimate','draft','sent','overdue') then raise exception 'Use the payment panel to mark an invoice paid.';end if;
 if p_id is not null then
 select * into i from public.invoices where id=p_id and garage_id=p_garage for update;
 if not found then raise exception 'Invoice not found.';end if;
 if i.status='paid' or exists(select 1 from public.invoice_payments where invoice_id=i.id) then raise exception 'An invoice with payments cannot be edited.';end if;
 update public.invoices set customer_id=(p_input->>'customerId')::uuid,vehicle_id=nullif(p_input->>'vehicleId','')::uuid,date=(p_input->>'invoiceDate')::date,due_date=(p_input->>'dueDate')::date,vat_rate=(p_input->>'vatRate')::numeric,status=(p_input->>'status')::public.invoice_status,notes=nullif(p_input->>'notes','') where id=i.id returning id into invoice_id;
 delete from public.invoice_line_items where invoice_line_items.invoice_id=i.id;
 else
 insert into public.invoices(garage_id,customer_id,vehicle_id,date,due_date,vat_rate,status,notes) values(p_garage,(p_input->>'customerId')::uuid,nullif(p_input->>'vehicleId','')::uuid,(p_input->>'invoiceDate')::date,(p_input->>'dueDate')::date,(p_input->>'vatRate')::numeric,coalesce(p_input->>'status','draft')::public.invoice_status,nullif(p_input->>'notes','')) returning id into invoice_id;
 end if;
 for l in select * from jsonb_array_elements(p_input->'lineItems') loop
 insert into public.invoice_line_items(garage_id,invoice_id,description,quantity,unit_price) values(p_garage,invoice_id,l->>'description',(l->>'quantity')::numeric,(l->>'unitPrice')::numeric);
 end loop;
 return invoice_id;
end $$;
revoke all on function private.save_invoice(uuid,uuid,jsonb) from public;
grant execute on function private.save_invoice(uuid,uuid,jsonb) to authenticated;
create function public.save_workshop_invoice(p_garage uuid,p_id uuid,p_input jsonb) returns uuid language sql security invoker set search_path='' as $$select private.save_invoice(p_garage,p_id,p_input);$$;
revoke all on function public.save_workshop_invoice(uuid,uuid,jsonb) from public;
grant execute on function public.save_workshop_invoice(uuid,uuid,jsonb) to authenticated;
