# ADR-008: Daily-recurring tasks via client-triggered reset (not a cron job)

- Status: Accepted
- Date: 2026-07-26

## Context

`routine_tasks` was a one-shot record: once `is_done` was set to `true`, nothing ever set it
back to `false`. For a genuine daily habit (drink water, meditate, exercise), the user had to
either manually uncheck and recheck the same task every day, or create a brand-new task daily.
Neither matches how habit formation actually works, and it made the dashboard's "streak"
metrics mostly decorative for the exact users the product is meant to help (people who forget
things or procrastinate need a fresh, low-friction cue each day, not a manual reset ritual).

## Decision

Add `routine_tasks.is_recurring boolean`. For a recurring task, `is_done` means "done today",
not "done, permanently". Freshness is restored by a Postgres RPC,
`reset_recurring_tasks(p_today date)`, called once per app load (`refreshAll`) with the
**caller's own local calendar date** (computed in the browser, not server-side `now()`), so the
day boundary matches the user's real timezone instead of UTC.

The reset RPC sets a transaction-local flag (`app.bypass_task_event`) before flipping
`is_done` back to `false`. The existing `handle_task_completion()` trigger checks that flag and
skips writing a `routine_task_events` row when it's set — the daily reset is not "the user gave
up on the task", and letting it through would have shown up as a synthetic `uncompleted` event
and inflated `computeStruggleTasks`' reopen score every single day for every habit.

No cron job / scheduled Edge Function was introduced for this. A lazy, client-triggered reset:

- avoids running server-side infra just for this project's scale,
- avoids the "which timezone is midnight" problem a UTC-scheduled cron would have,
- and is naturally idempotent — if a user doesn't open the app for three days, the next load
  still resets correctly on that single read.

The one accepted trade-off: a recurring task's checkbox on a screen the user left open across a
midnight boundary won't flip back to unchecked until the next reload/refetch. This was judged
acceptable for a personal habit tracker.

## Consequences

Positive:

- Streaks and "días activos" now measure something real for recurring habits, not just tasks
  the user happens to recreate manually.
- No new operational surface (no scheduler to monitor, no timezone config to get wrong).

Trade-offs:

- The reset is best-effort from the frontend's perspective (`resetRecurringTasks` swallows its
  own errors) — if the RPC/migration isn't deployed yet, recurring tasks silently behave like
  one-off tasks instead of breaking the load flow.
- Recurrence is daily-only for v1 (no per-weekday cadence at the task level). The existing
  per-routine `daysOfWeek` schedule in `dashboardPrefsStore` is a separate, client-only
  preference for the "Hoy/Próximo" widgets and was deliberately not merged with this — doing so
  would require moving that schedule server-side first, which is out of scope here.

## Alternatives considered

- Server-side cron (`pg_cron` or a scheduled Edge Function) resetting all recurring tasks at a
  fixed UTC hour: rejected — wrong for users outside UTC, and adds infra to operate/monitor for
  a problem the lazy client-triggered approach solves just as well.
- Deriving "done today" purely from `routine_task_events` without ever touching `is_done`:
  rejected — the completion trigger only fires on an actual boolean transition, so reusing a
  permanently-`true` column across days would silently stop generating events on day 2 onward.
- Per-task weekly recurrence (choose specific weekdays) in this same change: postponed to keep
  the change reviewable; daily recurrence already covers the dominant real habit pattern.

## References

- [backend/supabase/migrations/0006_recurring_tasks.sql](../../backend/supabase/migrations/0006_recurring_tasks.sql)
- [frontend/src/features/routines/routinesStore.ts](../../frontend/src/features/routines/routinesStore.ts)
- [frontend/src/features/routines/routinesService.ts](../../frontend/src/features/routines/routinesService.ts)
- [frontend/src/features/routines/components/RoutinePanel.tsx](../../frontend/src/features/routines/components/RoutinePanel.tsx)
