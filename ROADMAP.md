# Roadmap

## Near-term (Now -> 6 weeks)

1. Let the user edit an existing task (title/description/date/time/recurring) instead of only
   create-or-delete.
2. Connect `send-due-reminders` to a real email provider (Resend/Postmark) and add a settings
   screen for `reminder_preferences` (currently a backend-only table with no frontend UI); wire
   the Edge Function into a schedule instead of requiring a manual dashboard trigger.
3. Quick-capture shortcuts (hoy/mañana/fecha) next to the always-visible quick-add input, so
   scheduling something for later doesn't require the full routine wizard.
4. "Posponer" (snooze to tomorrow) action on a task, and a streak-protection rule so a single
   missed day doesn't zero out the counter outright.
5. Add server-side rate limiting for `get_email_by_username` (client-side timing mitigation
   is in place; request-volume limiting still isn't).
6. Full-page accessibility audit (axe) for `DashboardPage`/`RoutinePanel` — today only the
   shared UI kit has automated a11y coverage.

## Mid-term (6 -> 12 weeks)

1. Per-task weekly recurrence (specific weekdays), building on the daily-recurrence engine
   from ADR-008.
2. Add service-worker app-shell strategy improvements (PWA manifest for installability, local
   Notification API fallback before investing in full push infrastructure).
3. Implement task reordering UX with persistence.

## Longer-term

1. Real-time updates where beneficial.
2. Exportable analytics reports.
3. Advanced personalization and profile capabilities.

## Delivery principle

Prioritize user-value + reliability + security over feature volume.
