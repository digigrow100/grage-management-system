-- Adds structured name/business fields, extended address fields and
-- communication preferences to customers. full_name stays as-is and keeps
-- being the fallback display name until every read path is migrated (spec
-- 5.4). first_name/last_name are backfilled from full_name only when it
-- splits unambiguously into exactly two words; anything else is left null
-- so the UI's full_name fallback keeps working rather than showing a
-- wrong guess.
--
-- Run this once against the project's Postgres database (Supabase SQL
-- Editor, or `supabase db push`).

alter table customers
  add column if not exists customer_type text not null default 'individual',
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists business_name text,
  add column if not exists alternate_contact_name text,
  add column if not exists alternate_contact_phone text,
  add column if not exists address_line_2 text,
  add column if not exists county text,
  add column if not exists country_code text not null default 'GB',
  add column if not exists google_place_id text,
  add column if not exists latitude numeric(10,7),
  add column if not exists longitude numeric(10,7),
  add column if not exists email_opt_in boolean not null default true,
  add column if not exists sms_opt_in boolean not null default false,
  add column if not exists marketing_opt_in boolean not null default false;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'customers_customer_type_check') then
    alter table customers
      add constraint customers_customer_type_check
      check (customer_type in ('individual', 'business'));
  end if;
end $$;

update customers
set
  first_name = split_part(trim(full_name), ' ', 1),
  last_name = split_part(trim(full_name), ' ', 2)
where first_name is null
  and last_name is null
  and trim(full_name) ~ '^\S+\s+\S+$';
