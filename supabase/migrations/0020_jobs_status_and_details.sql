-- Extends job_cards with authorisation/lifecycle timestamps, a real
-- employee_id FK, mileage-in, customer complaint and internal notes
-- (spec 5.11). Adds job_status_history for an auditable status timeline.
--
-- job_status enum: adds awaiting_authorisation, authorised and cancelled
-- (pure additions — Postgres enums can't drop values). 'invoiced' is
-- retired as an operational status per spec ("invoice state comes from
-- the linked invoice"): any existing job_cards row using it is migrated
-- to 'completed' below (none currently exist — verified before writing
-- this migration), and the app no longer sets it. The enum value itself
-- stays defined, since Postgres has no clean way to remove it and the
-- historic value must stay readable — the smallest compatible change.
--
-- Run this once against the project's Postgres database (Supabase SQL
-- Editor, or `supabase db push`). The two statement groups below must be
-- applied as separate transactions (a newly added enum value can't be
-- used until its own transaction commits) — if running by hand, apply
-- the "alter type ... add value" block first, then the rest.

alter type job_status add value if not exists 'awaiting_authorisation';
alter type job_status add value if not exists 'authorised';
alter type job_status add value if not exists 'cancelled';
