# Garage workflows

The migrations add enforced role permissions, vehicle-linked timed bookings with bay/technician conflict checks, stock consumption and cost snapshots, invoices from job lines, a payment ledger, operating expenses, and a retryable email reminder queue.

## Production configuration

- Deploy the default branch to the original Vercel project under `digigrow-team`.
- Set `NEXT_PUBLIC_APP_URL` to the canonical production URL (no trailing slash).
- In Supabase Authentication URL Configuration, allow `<production-url>/auth/callback`. Password recovery uses PKCE and the same browser that requested the email. Recovery email templates may alternatively use `/auth/callback?token_hash={{ .TokenHash }}&type=recovery`.
- Supabase Edge Function `deliver-garage-reminders` is deployed with gateway JWT verification disabled because it supports both a database-generated worker token and authenticated user JWTs. The database checks worker tokens; interactive requests validate the user and reminder permission. Never expose the cron worker key.
- Set `RESEND_API_KEY` and `REMINDER_FROM_EMAIL` as **Supabase function secrets**, using a verified sending domain. Do not put these in public environment variables or git. The worker returns 503 without claiming queued messages when sender configuration is missing.
- Automatic reminders default to off. In Reminders → Reminder Settings, enable them and set lead time/service interval. Edit a customer's email consent before enabling delivery if needed.
- MOT/service reminders queue daily at 07:00 UTC; delivery runs every 15 minutes. Manual email reminders queue when due. Delivery history shows failures. At most five delivery attempts are made, with deterministic provider idempotency keys.

## Accounting

Accounting uses cash-basis revenue excluding VAT. Partial receipts recognise the proportional job-part cost. Cost snapshots for jobs predating this migration use the part cost available at migration time; historical purchase costs cannot be reconstructed. A legacy invoice marked paid is treated as fully received, but no payment date or method is invented. Unlinked manual invoices have no job-part cost; noncatalogue job parts allow a unit cost to be entered.

Record payments through the payment panel. Payment-recorded invoices cannot have their items/customer/vehicle/VAT changed, and paid invoices cannot be reopened or deleted. Job lines become immutable once an invoice is created. Expenses are net of recoverable VAT; avoid adding job parts again as operating expenses.

## Verification

`npm run lint` and `npm run build` verify the app. `supabase/tests/workflows.sql` runs transactional integration checks against an existing owner account and rolls back all fixtures. No emails are sent. Run it with a privileged database session; it switches into the authenticated database role after fixture setup.
