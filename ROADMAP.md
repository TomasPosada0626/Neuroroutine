# Roadmap

## Near-term (Now -> 6 weeks)

1. Connect `send-due-reminders` to a real email provider (Resend/Postmark) and add a settings
   screen for `reminder_preferences` (currently a backend-only table with no frontend UI); wire
   the Edge Function into a schedule instead of requiring a manual dashboard trigger. The local
   browser notification fallback (ADR-010) covers same-day reminders in the meantime.
2. Add server-side rate limiting for `get_email_by_username` (client-side timing mitigation
   is in place; request-volume limiting still isn't).
3. Web Push (works with the tab closed) as a stronger alternative to the current local-only
   Notification fallback, once a push subscription + server trigger are worth the infra cost.

## Mid-term (6 -> 12 weeks)

1. Per-task weekly recurrence (specific weekdays), building on the daily-recurrence engine
   from ADR-008.
2. Implement task reordering UX with persistence.
3. PNG app icons (192/512, maskable) alongside the current SVG icon for stricter PWA-install
   checks on platforms that don't accept SVG manifest icons.

## Longer-term

1. Real-time updates where beneficial.
2. Exportable analytics reports.
3. Advanced personalization and profile capabilities.

## Delivery principle

Prioritize user-value + reliability + security over feature volume.

## Recently completed

- Task editing (title/description/date/time/recurring), not just create-or-delete.
- "Posponer" (snooze to tomorrow) action on one-off tasks.
- Quick-capture chips (Hoy/Mañana/pick a date) in the always-visible quick-add input.
- Streak freeze: one missed day no longer zeroes the current streak (ADR-009).
- Full-page accessibility audit (axe, via Playwright) covering landing, login, and the dashboard
  in multiple real states, not just the shared UI kit — six real violations found and fixed.
- Installable PWA manifest + local due-task browser notification fallback (ADR-010).
