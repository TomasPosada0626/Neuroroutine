# ADR-010: Client-only browser notifications as a fallback before real email/push reminders

- Status: Accepted
- Date: 2026-07-26

## Context

`send-due-reminders` (see ADR context in `backend/supabase/functions/README.md`) only writes a
`reminder_due_task` row to `app_events` — no email or push provider is wired up yet, and the
function isn't even scheduled automatically. Until that provider integration lands, users with
due or overdue tasks get no reminder of any kind, which defeats the point of setting a due date
at all for someone who forgets things easily.

## Decision

Ship a small, honest, zero-infrastructure fallback: if the user grants the browser's
`Notification` permission, the dashboard checks once per local calendar day for pending tasks
due today or earlier and fires a single local notification summarizing them
(`frontend/src/shared/notifications/dueTaskNotifications.ts`). This requires no server, no
provider account, and no scheduled job — it runs entirely in the browser, deduplicated via a
`localStorage` flag keyed by date so it fires at most once per day per browser.

This is explicitly a stop-gap, not a replacement for real reminders: it only fires while a
dashboard tab is open (or was opened earlier that day) in that specific browser, with no delivery
guarantee, no cross-device reach, and no reminder if the user never opens the app that day.

## Consequences

Positive:

- Immediate, real reminder value with no waiting on an email/push provider decision or credential.
- No new operational surface — nothing to deploy, schedule, or monitor.

Trade-offs:

- Reminder only fires if/when the user opens the dashboard that day, which is a meaningfully
  weaker guarantee than a real scheduled email or push notification.
- Per-browser, not per-account: switching devices or clearing site data resets the opt-in.

## Alternatives considered

- Wait for the real email provider integration before shipping any reminder UX: rejected —
  leaves the exact target user (forgetful/procrastinating) with zero reminder support in the
  meantime, for an indefinite amount of time.
- Web Push (works even with the tab closed): rejected for now — needs a service worker push
  subscription flow and a server endpoint to trigger sends, which is materially more
  infrastructure than this fallback; a natural next step once real reminders are prioritized.

## References

- [frontend/src/shared/notifications/dueTaskNotifications.ts](../../frontend/src/shared/notifications/dueTaskNotifications.ts)
- [frontend/src/pages/DashboardPage.tsx](../../frontend/src/pages/DashboardPage.tsx)
- [backend/supabase/functions/send-due-reminders/index.ts](../../backend/supabase/functions/send-due-reminders/index.ts)
