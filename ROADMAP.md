# Roadmap

## Near-term (Now -> 6 weeks)

1. Web Push (works with the tab closed) as a stronger alternative to the current local-only
   Notification fallback (ADR-010), now that `reminder_preferences.push_enabled` exists in the
   schema and frontend type but has no subscription flow or server trigger behind it yet.
2. Verify the Resend sending domain: emails currently go out from `onboarding@resend.dev`
   (Resend's shared test sender), which only delivers to the Resend account's own verified
   address. Verifying a real sending domain in Resend and setting `RESEND_FROM_EMAIL` is required
   before reminder emails can reach arbitrary users.

## Mid-term (6 -> 12 weeks)

1. Task reordering UX with persistence (no `sort_order`/`position` column or drag-reorder UI
   exists yet for routine tasks; the dashboard's `WidgetOrderEditor` only reorders dashboard
   widgets, not tasks).
2. Per-user reminder time in the automated schedule: `send-due-reminders-daily` (ADR-013) runs
   once daily at a fixed UTC hour, so `reminder_preferences.reminder_hour`/`timezone` are honored
   by the settings screen and stored correctly, but not yet consulted by the cron trigger itself.

## Longer-term

1. Real-time updates where beneficial.
2. Exportable analytics reports.
3. Advanced personalization and profile capabilities.

## Delivery principle

Prioritize user-value + reliability + security over feature volume.

## Recently completed

- Real email reminders via Resend from `send-due-reminders`, plus a settings screen
  (`ReminderPreferencesPanel`) so users can actually configure `reminder_preferences`
  (email on/off, reminder hour) instead of that table being backend-only (ADR-012).
- Automatic daily schedule for `send-due-reminders` via `pg_cron` + `pg_net`, replacing the
  manual-invocation-only gap (ADR-013).
- Server-side rate limiting for `get_email_by_username`, on top of the existing client-side
  timing mitigation.
- Per-task weekly recurrence (specific weekdays), building on the daily-recurrence engine
  from ADR-008 (ADR-011).
- PNG app icons (192/512, maskable) alongside the SVG icon for stricter PWA-install checks.
- Task editing (title/description/date/time/recurring), not just create-or-delete.
- "Posponer" (snooze to tomorrow) action on one-off tasks.
- Quick-capture chips (Hoy/Mañana/pick a date) in the always-visible quick-add input.
- Streak freeze: one missed day no longer zeroes the current streak (ADR-009).
- Full-page accessibility audit (axe, via Playwright) covering landing, login, and the dashboard
  in multiple real states, not just the shared UI kit — six real violations found and fixed.
- Installable PWA manifest + local due-task browser notification fallback (ADR-010).
