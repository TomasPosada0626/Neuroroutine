# Supabase Edge Functions

## send-due-reminders

Purpose:

- Finds due tasks (`routine_tasks`) for today where `is_done = false`.
- Reads `reminder_preferences` per user (defaults to reminders on if a user never set one, matching
  the table's own `email_enabled DEFAULT true`).
- Writes `app_events` records with `event_name = reminder_due_task` (one per due task) so other
  consumers/analytics can see reminder activity, regardless of whether email is configured.
- If `RESEND_API_KEY` is set, sends one summary email per user (all their due tasks in a single
  email, not one email per task) via [Resend](https://resend.com). Without that secret, the
  function still runs and still records the `app_events` rows — email sending degrades gracefully
  rather than failing the whole run.

Deploy:

```bash
npx supabase functions deploy send-due-reminders --project-ref <project-ref>
```

Invoke manually: newer Supabase CLI versions dropped `supabase functions invoke`. Call the
deployed function directly over HTTP instead (needs the project's `service_role` key, from
Project Settings -> API — never the anon key, since this endpoint has no other auth check):

```bash
curl -X POST "https://<project-ref>.supabase.co/functions/v1/send-due-reminders" \
  -H "Authorization: Bearer <service_role_key>"
```

```powershell
Invoke-RestMethod -Uri "https://<project-ref>.supabase.co/functions/v1/send-due-reminders" `
  -Method Post -Headers @{ Authorization = "Bearer <service_role_key>" }
```

Tests: `index.test.ts` covers every pure function (`escapeHtml`, `renderReminderEmail`,
`sendReminderEmail`, `getHourInTimezone`, `isReminderHourNow`) with a real
[Deno](https://deno.com) test run — 20 tests, 92.0% branch / 85.7% function coverage on those
functions. Requires the Deno CLI (`irm
https://deno.land/install.ps1 | iex` on Windows, or `curl -fsSL https://deno.land/install.sh |
sh` elsewhere) since this project has no other Deno tooling installed by default:

```bash
cd backend/supabase/functions/send-due-reminders
deno test --allow-net=api.resend.com index.test.ts
```

Not covered: the main request handler (`handleRequest` — the Supabase queries and orchestration
around those pure functions) has no unit test, since mocking the Supabase client meaningfully
would need more scaffolding than this function's size currently justifies. It's verified instead
by a live invocation against the real project (see "Invoke manually" above) — do that after any
change to `handleRequest` itself.

Schedule: `backend/supabase/migrations/0010_schedule_send_due_reminders.sql` sets up a `pg_cron` +
`pg_net` job that calls this function automatically — see
[ADR-013](../../../docs/adr/ADR-013-scheduled-reminders-pg-cron.md) for why this was chosen over
the Dashboard's Edge Functions -> Schedules UI. `0012_hourly_reminder_schedule.sql` changed it to
run every hour (`0 * * * *` UTC) instead of once daily, so `handleRequest`'s
`isReminderHourNow(reminder_hour, timezone, now)` check can actually honor each user's configured
reminder hour — the original daily-at-noon-UTC version ran once for everyone regardless of what
they'd set. Either migration reads the service role key from Supabase Vault rather than embedding
it in the file; **after applying them you must run once, directly in the SQL Editor, never
saved/committed anywhere**:

```sql
select vault.create_secret('<your real service_role key>', 'send_due_reminders_service_key');
```

Until that secret is set, the cron job exists but every run fails with 401 — check
`select * from cron.job_run_details order by start_time desc limit 5;` if reminders don't seem
to be firing.

Required env vars in the Supabase project:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Optional env vars (enable real email sending; see ADR-012):

- `RESEND_API_KEY` — from your [Resend dashboard](https://resend.com/api-keys). Set it as a
  function secret (`npx supabase secrets set RESEND_API_KEY=... --project-ref <project-ref>` or
  via Dashboard -> Edge Functions -> Secrets), never commit it.
- `RESEND_FROM_EMAIL` — defaults to `NeuroRoutine <onboarding@resend.dev>` (Resend's shared test
  sender, which can only deliver to the Resend account's own verified email). For real delivery to
  arbitrary users, verify a sending domain in Resend and set this to an address on that domain.
- `ALERT_EMAIL` — optional. If set (and `RESEND_API_KEY` is configured), a run where one or more
  reminder emails failed to send also emails a one-line-per-failure summary to this address via
  Resend, instead of that failure only being visible in `emailErrors` on the HTTP response / the
  Supabase function invocation logs. Without it, a failed run still logs via `console.error` but
  nothing actively notifies anyone.
