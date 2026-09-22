-- Extends reminders with type/channel/status/scheduling (spec 5.13), and
-- adds per-garage reminder_settings. Channel 'in_app' is fully functional
-- (a reminder becomes visible once due); 'email'/'sms' record intent but
-- have no working delivery path yet — no provider is configured (Resend
-- was not set up), so this migration only builds the queue/status
-- machinery, not a fake send. processDueReminders (added in application
-- code) only transitions in_app reminders scheduled -> sent.
--
-- Run this once against the project's Postgres database (Supabase SQL
-- Editor, or `supabase db push`).

alter table reminders
  add column if not exists reminder_type text not null default 'general',
  add column if not exists channel text not null default 'in_app',
  add column if not exists status text not null default 'scheduled',
  add column if not exists scheduled_at timestamptz,
  add column if not exists sent_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists error_message text,
  add column if not exists created_by uuid;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'reminders_type_check') then
    alter table reminders
      add constraint reminders_type_check
      check (reminder_type in ('mot', 'service', 'booking', 'general'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'reminders_channel_check') then
    alter table reminders
      add constraint reminders_channel_check
      check (channel in ('in_app', 'email', 'sms'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'reminders_status_check') then
    alter table reminders
      add constraint reminders_status_check
      check (status in ('scheduled', 'sent', 'completed', 'cancelled', 'failed'));
  end if;
end $$;

-- Backfill scheduled_at from due_date for existing rows, and status from
-- the existing `done` boolean so old and new rows behave consistently.
update reminders
set scheduled_at = due_date::timestamptz
where scheduled_at is null;

update reminders
set status = 'completed'
where done = true and status = 'scheduled';

create index if not exists reminders_status_idx on reminders(garage_id, status, scheduled_at);
create index if not exists reminders_type_idx on reminders(garage_id, reminder_type);

create table if not exists reminder_settings (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid not null references garage_settings(id) on delete cascade,
  reminder_type text not null,
  enabled boolean not null default true,
  days_before integer,
  hours_before integer,
  email_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reminder_settings_type_check check (reminder_type in ('mot', 'service', 'booking', 'general')),
  constraint reminder_settings_garage_type_key unique (garage_id, reminder_type)
);

alter table reminder_settings enable row level security;

drop policy if exists "reminder_settings_select" on reminder_settings;
create policy "reminder_settings_select" on reminder_settings for select to authenticated using (is_garage_member(garage_id));
drop policy if exists "reminder_settings_insert" on reminder_settings;
create policy "reminder_settings_insert" on reminder_settings for insert to authenticated with check (is_garage_member(garage_id));
drop policy if exists "reminder_settings_update" on reminder_settings;
create policy "reminder_settings_update" on reminder_settings for update to authenticated using (is_garage_member(garage_id)) with check (is_garage_member(garage_id));
drop policy if exists "reminder_settings_delete" on reminder_settings;
create policy "reminder_settings_delete" on reminder_settings for delete to authenticated using (is_garage_member(garage_id));
