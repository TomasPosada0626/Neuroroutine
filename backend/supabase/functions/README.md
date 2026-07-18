# Supabase Edge Functions

## send-due-reminders

Purpose:

- Finds due tasks (`routine_tasks`) for today where `is_done = false`.
- Reads `reminder_preferences` per user.
- Writes `app_events` records with `event_name = reminder_due_task` so reminder providers can consume them.

Deploy:

```bash
npx supabase functions deploy send-due-reminders --project-ref <project-ref>
```

Invoke manually:

```bash
npx supabase functions invoke send-due-reminders --project-ref <project-ref>
```

Schedule (recommended):

- Create a daily schedule in Supabase Dashboard -> Edge Functions -> Schedules.
- Suggested cron: `0 12 * * *` (adjust to your audience/timezones).

Required env vars in the Supabase project:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Optional next step:

- Add provider integration (email/push) that consumes `app_events` with `reminder_due_task`.
