create or replace function public.set_invoice_number() returns trigger language plpgsql set search_path='' as $$
declare prefix text;next_seq integer;candidate text;begin
 if new.number is not null and new.number<>'' then return new;end if;
 perform pg_advisory_xact_lock(hashtext(new.garage_id::text));
 select coalesce(invoice_prefix,'INV') into prefix from public.garage_settings where id=new.garage_id;
 select count(*)+1 into next_seq from public.invoices where garage_id=new.garage_id;
 loop
  candidate=coalesce(prefix,'INV')||'-'||lpad(next_seq::text,4,'0');
  exit when not exists(select 1 from public.invoices where garage_id=new.garage_id and number=candidate);
  next_seq=next_seq+1;
 end loop;
 new.number=candidate;return new;
end $$;
revoke all on function public.set_invoice_number() from public;
