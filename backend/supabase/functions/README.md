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

Schedule (recommended):

- Create a daily schedule in Supabase Dashboard -> Edge Functions -> Schedules.
- Suggested cron: `0 12 * * *` (adjust to your audience/timezones).

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
