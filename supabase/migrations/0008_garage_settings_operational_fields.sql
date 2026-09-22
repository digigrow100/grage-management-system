-- Adds operational settings fields to garage_settings: contact info, branding,
-- timezone/currency, VAT mode, default labour rate and calendar behaviour
-- settings. Purely additive with safe defaults, so existing rows and code
-- keep working unchanged.
--
-- Run this once against the project's Postgres database (Supabase SQL
-- Editor, or `supabase db push`).

alter table garage_settings
  add column if not exists contact_email text,
  add column if not exists contact_phone text,
  add column if not exists logo_url text,
  add column if not exists timezone text not null default 'Europe/London',
  add column if not exists currency text not null default 'GBP',
  add column if not exists vat_mode text not null default 'not_registered',
  add column if not exists default_labour_rate numeric(12,2) not null default 0,
  add column if not exists calendar_start_hour smallint not null default 8,
  add column if not exists calendar_end_hour smallint not null default 18,
  add column if not exists calendar_slot_minutes smallint not null default 30,
  add column if not exists allow_overlapping_jobs boolean not null default false,
  add column if not exists smart_gap_minutes integer not null default 0,
  add column if not exists updated_by uuid;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'garage_settings_vat_mode_check') then
    alter table garage_settings
      add constraint garage_settings_vat_mode_check
      check (vat_mode in ('not_registered', 'inclusive', 'exclusive'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'garage_settings_calendar_hours_check') then
    alter table garage_settings
      add constraint garage_settings_calendar_hours_check
      check (calendar_start_hour >= 0 and calendar_start_hour <= 23
             and calendar_end_hour >= 1 and calendar_end_hour <= 24
             and calendar_end_hour > calendar_start_hour);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'garage_settings_calendar_slot_check') then
    alter table garage_settings
      add constraint garage_settings_calendar_slot_check
      check (calendar_slot_minutes in (15, 30, 60));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'garage_settings_default_labour_rate_check') then
    alter table garage_settings
      add constraint garage_settings_default_labour_rate_check
      check (default_labour_rate >= 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'garage_settings_smart_gap_minutes_check') then
    alter table garage_settings
      add constraint garage_settings_smart_gap_minutes_check
      check (smart_gap_minutes >= 0);
  end if;
end $$;
