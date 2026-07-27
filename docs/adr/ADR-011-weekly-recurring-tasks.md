# ADR-011: Optional per-task weekly cadence for recurring tasks

- Status: Accepted
- Date: 2026-07-27

## Context

ADR-008 introduced daily-recurring tasks and explicitly postponed per-weekday cadence at the
task level ("Recurrence is daily-only for v1"). In practice, several common habits aren't daily
(gym on Mon/Wed/Fri, a weekly review on Sundays), and the only workaround was either forcing them
into a daily recurring task (which then needs to be manually unchecked on off days) or a one-off
task recreated by hand every week.

The per-routine `daysOfWeek` schedule already in `dashboardPrefsStore` (used by the "Hoy/Próximo"
widgets) is a separate, client-only preference tied to a whole routine, not an individual task,
and ADR-008 deliberately did not merge the two. This ADR closes the task-level gap that ADR-008
left open, without touching that unrelated routine-level schedule.

## Decision

Add `routine_tasks.recurrence_days_of_week smallint[]` (0=Sun..6=Sat, matching JS
`Date#getDay()`). Null or an empty array means "every day" — identical to the original ADR-008
behavior, so every task created before this migration keeps working unchanged.

`reset_recurring_tasks(p_today date)` now only resets a task's `is_done` back to `false` when
today's weekday is in its `recurrence_days_of_week` (or that column is null/empty, i.e. daily).
On a day that isn't selected, the task is left alone rather than force-reset — a habit picked for
Mon/Wed/Fri doesn't get silently unchecked on a Tuesday just because the reset RPC ran. The
trade-off: if it was left checked from the last valid day, it stays visually checked on off days
instead of disappearing or graying out. Filtering *visibility* by day (hiding/dimming a task on
days it isn't scheduled) is out of scope here — it would ripple into the dashboard's "Today"
widget and task-list rendering well beyond the recurrence engine itself, and isn't needed for the
core "the checkbox resets on the right days" behavior this ADR targets.

UI: `TaskFormModal` gets a day-picker (same D/L/M/X/J/V/S pill pattern already used for the
per-routine schedule editor in `RoutinePanel`), shown only while "Repetir cada día" is checked.
Leaving no day selected keeps the original daily behavior. `RoutinePanel`'s recurring-task badge
shows "Diario" for daily tasks and an abbreviated day list (e.g. "L X V") for weekly ones.

**Scope boundary, stated plainly**: the quick-add input and `RoutineWizardModal`'s bulk task
creation keep their existing "Repetir cada día (hábito)" checkbox with no day picker — tasks
created through those stay daily-only. Adding a day-picker per row to a multi-row bulk-creation
wizard is a real UI design problem on its own (space, mobile layout, per-row state) that doesn't
belong bundled into this change. Weekly cadence is configurable today via the task edit form,
which every task already goes through to get a description/date/time anyway.

## Consequences

Positive:

- Closes a gap ADR-008 named directly, without redesigning anything it already decided.
- Fully backward compatible: existing recurring tasks have `recurrence_days_of_week = null` and
  behave exactly as before.
- Reuses an existing, already-tested UI pattern (day pills) instead of inventing a new one.

Trade-offs:

- A task's checkbox can stay checked on a day it isn't scheduled for (see above) — visible-but-
  stale rather than hidden, judged acceptable for v1.
- Bulk-created and quick-added tasks can't get a specific weekly cadence at creation time; editing
  the task afterward is the only path until (if ever) that's worth the added wizard complexity.
- No change to `get_nr_schema_status`/`SchemaBanner`: this migration doesn't need a new
  frontend-facing capability check the way `is_recurring` did, since the fallback behavior
  (nothing set) is already the pre-migration default rather than a broken/degraded state.

## Alternatives considered

- Filtering task visibility by scheduled day across the dashboard/task list: rejected for this
  change — real value, but a materially larger change than "extend the recurrence engine",
  better done as its own follow-up once this lands.
- Day-picker in `RoutineWizardModal`'s bulk rows: rejected for v1, see scope boundary above.
- A separate `task_recurrence_rules` table instead of a column on `routine_tasks`: rejected as
  over-engineered for "an optional array of weekdays" — no other recurrence shape (monthly,
  every-N-days, etc.) is planned, so a dedicated table would add a join for no current benefit.

## References

- [backend/supabase/migrations/0008_weekly_recurring_tasks.sql](../../backend/supabase/migrations/0008_weekly_recurring_tasks.sql)
- [ADR-008](./ADR-008-recurring-tasks-daily-reset.md)
- [frontend/src/features/routines/components/TaskFormModal.tsx](../../frontend/src/features/routines/components/TaskFormModal.tsx)
- [frontend/src/features/routines/routinesService.ts](../../frontend/src/features/routines/routinesService.ts)
- [frontend/src/features/routines/routinesStore.ts](../../frontend/src/features/routines/routinesStore.ts)
