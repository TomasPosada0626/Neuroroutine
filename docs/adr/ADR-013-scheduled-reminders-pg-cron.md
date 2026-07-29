# ADR-013: Schedule send-due-reminders via pg_cron + pg_net, not the Dashboard UI

- Status: Accepted
- Date: 2026-07-29

## Context

`send-due-reminders` was deployed with real Resend email sending (ADR-012), but nothing ever
called it automatically — the commit that deployed it says so directly: "Recurring schedule is
still not set (manual invocation only for now)." The project's own README had documented the
fix as "Create a daily schedule in Supabase Dashboard -> Edge Functions -> Schedules" since the
function was first written, and that manual step was never done. A feature that only runs when
someone remembers to click a button in a dashboard isn't actually shipped.

## Decision

Schedule the function from inside Postgres itself, in a migration
(`0010_schedule_send_due_reminders.sql`), using two official Supabase-supported extensions:

- `pg_cron` to run a job on a cron expression.
- `pg_net` to make the HTTP call to the function's endpoint from within that job.

The job calls the deployed function URL with the project's `service_role` key as a bearer token
(the same auth this project's README already documents for manual invocation). That key is never
written into the migration file — it's stored once in Supabase Vault
(`vault.create_secret(...)`, run directly in the SQL Editor, never saved to a file) and read at
call time via `vault.decrypted_secrets`. The migration itself only references the secret by name.

The migration is idempotent: it unschedules any existing job with the same name before
recreating it, so re-running this file (or a future migration that touches the same job) doesn't
accumulate duplicate cron entries.

## Consequences

Positive:

- The schedule is version-controlled and code-reviewable, not a Dashboard checkbox with no
  record in this repository of when or why it was set.
- Applying it follows the exact same "write the migration, tell the operator the one manual
  step with a real secret" pattern already used throughout this project's migrations — no new
  process to learn.
- Failure is observable and queryable (`cron.job_run_details`), not silent.

Trade-offs:

- Requires `pg_cron` and `pg_net` to be enabled on the project, and requires the operator to run
  one `vault.create_secret(...)` statement by hand after applying the migration — this ADR
  cannot make that step itself, since it needs a real secret this codebase must never contain.
- A single daily UTC time (12:00) is a coarse approximation for a user base spread across
  timezones; `reminder_preferences.reminder_hour`/`timezone` per user aren't consulted by the
  schedule itself (only by `handleRequest`'s own due-task query) — the cron trigger just decides
  *that* the function runs today, not a personalized *when* per user. Revisit if per-user
  scheduling granularity becomes worth the added complexity.

## Alternatives considered

- Supabase Dashboard -> Edge Functions -> Schedules: rejected as the primary mechanism — it's a
  real, simpler option for a solo operator, but it leaves zero trace in the repository of what's
  scheduled or why, and it was already the documented plan for weeks without anyone doing it.
  Nothing prevents using it in addition to (or instead of) the migration if that's ever
  preferred; the code doesn't depend on which mechanism triggers it.
- A third-party scheduler (GitHub Actions cron, an external cron service) hitting the function
  over HTTPS: rejected — adds an external dependency and a second place secrets must be
  configured, for no benefit over pg_cron/pg_net, which already run inside the same Supabase
  project this whole system depends on.

## References

- [backend/supabase/migrations/0010_schedule_send_due_reminders.sql](../../backend/supabase/migrations/0010_schedule_send_due_reminders.sql)
- [backend/supabase/functions/README.md](../../backend/supabase/functions/README.md)
- [ADR-012](./ADR-012-resend-email-reminders.md)
