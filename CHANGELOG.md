# Changelog

All notable changes to this project are documented here.

The format follows Keep a Changelog and Semantic Versioning principles.

## [Unreleased]

### Added

- Self-service account deletion (`delete_own_account()` RPC + "Zona de peligro" in the
  customize-dashboard panel): deletes the account and cascades through every user-data table,
  closing the gap between what `PRIVACY.md` promised and what the product did.
- Database indexes on `routines.user_id`, `routine_tasks.user_id`, and `routine_tasks.routine_id`
  — every RLS policy on those tables filters by exactly these columns.
- A second rate-limit bucket on `get_email_by_username`, keyed by the queried username instead of
  only the caller's IP, so distributing probes across many real IPs no longer evades the limit.
- Daily purge of stale `rpc_rate_limits` rows via `pg_cron`.
- `main` branch protection enforced live via the GitHub API (required status checks, no
  force-push, no branch deletion); production deploys now gated on CI success (`workflow_run`)
  instead of firing independently off the same push.
- Lighthouse CI (informational) and a scheduled synthetic uptime check against production.
- A CI check that `schema.sql`'s declared version matches the highest applied migration.
- ESLint-enforced architecture boundaries (`eslint.config.js`): a feature can no longer import
  another feature's internals except `features/auth`, matching `ARCHITECTURE.md`'s documented
  rule instead of relying on manual review alone.
- Explicit `browserslist` (`package.json`) and Vite `build.target`, replacing an undocumented
  implicit default.
- Task editing: title, description, date/time, and the recurring flag can now be changed after
  creation (`TaskFormModal`) instead of only create-or-delete.
- "Posponer" action to move a one-off task's due date to tomorrow in a single click.
- Quick-capture chips (Hoy / Mañana / pick a date) next to the quick-add input.
- Streak freeze: the current streak now tolerates one missed day instead of resetting to zero;
  two consecutive misses still end it. See [ADR-009](docs/adr/ADR-009-streak-freeze-grace-day.md).
- Installable PWA manifest (`manifest.webmanifest`, real app icon replacing a broken favicon
  reference) and a local, no-server browser notification for tasks due today or earlier. See
  [ADR-010](docs/adr/ADR-010-client-only-fallback-notifications.md).
- Full-page accessibility test suite (`@axe-core/playwright`) covering the landing page, login,
  and the dashboard in four real states (populated, task-edit modal open, customize panel open,
  color contrast) against the live app — not just the shared UI kit in isolation.
- Daily-recurring tasks (`is_recurring`): a habit's checkbox now means "done today" and resets
  automatically once a new local day starts, instead of staying checked forever after the
  first completion. See [ADR-008](docs/adr/ADR-008-recurring-tasks-daily-reset.md).
- Optional weekly cadence for recurring tasks (`recurrence_days_of_week`): pick specific weekdays
  from the task edit form instead of resetting every day. See
  [ADR-011](docs/adr/ADR-011-weekly-recurring-tasks.md).
- PNG app icons (192x192, 512x512, regular + maskable) generated from the existing SVG design, so
  the install manifest doesn't depend on SVG icon support alone.
- Server-side rate limiting on `get_email_by_username` (8 calls/min per client IP), on top of the
  existing client-side timing mitigation for username enumeration.
- Real email reminders: `send-due-reminders` now sends one summary email per user (via Resend)
  for their tasks due today, gated behind an optional `RESEND_API_KEY` secret — without it, the
  function keeps its prior events-only behavior instead of failing. See
  [ADR-012](docs/adr/ADR-012-resend-email-reminders.md). Deployed with `RESEND_API_KEY`
  configured; no recurring schedule set yet — see the Roadmap section.
- Offline-sync conflict UX: a queued task that fails to sync for a real (non-network) reason
  now shows why and offers a "Descartar" action, instead of retrying silently forever.
- Sentry performance tracing, sampled instead of fully disabled.
- Accessibility test coverage (axe + keyboard) for the shared UI kit.
- ADR catalog and decision records in [docs/adr](docs/adr).
- Operational metrics baseline and service-level targets in [docs/operations/metrics.md](docs/operations/metrics.md).
- Security hardening guide with threat-oriented mitigations in [docs/security/hardening.md](docs/security/hardening.md).
- Release process documentation and automation workflow in [docs/releases/README.md](docs/releases/README.md) and [\.github/workflows/release.yml](.github/workflows/release.yml).
- Additional tests for routines services and offline queue.

### Fixed

- `<html lang="en">` corrected to `lang="es"` — every visible string in the app is Spanish; the
  wrong declared language broke WCAG 3.1.1 and made screen readers use English pronunciation.
- English fallback error copy in `LoginPage` ("Login failed" / "Google login failed") translated
  to Spanish; they only ever appeared on an unexpected non-`Error` throw, but broke language
  consistency when they did.
- `dashboard`'s `InsightsWidget` importing `features/reminders` internals directly (the only
  cross-feature import ARCHITECTURE.md sanctions is `features/auth`) — inverted into a callback
  the page injects instead.
- `schema.sql`'s declared `nr_schema_meta` version was stuck at 11 while 13+ migrations had
  already applied; now kept in sync and checked in CI.
- Creating a routine from the dashboard's wizard could leave the analytics selector and the
  routine panel out of sync with each other until a manual refresh (two independent caches of
  the same routine list).
- Six real accessibility defects found by the new axe E2E suite: missing `<main>` landmark on
  the auth pages, missing `<h1>` on the dashboard, three unlabeled number inputs in the
  customize panel, and a decorative checkbox nested inside a button (invalid for assistive tech
  even with `aria-hidden`) in the "Hoy" widget.
- Broken favicon reference (`/vite.svg` pointed at a file that didn't exist in `public/`).

### Changed

- Increased automated frontend coverage with additional branch-oriented tests.
- `owasp-checklist.md` updated to reflect that multi-user mutation regression tests and branch
  protection were already in place but marked as pending.

## [1.0.0] - 2026-07-18

### Added

- Root project README rewritten for practicum/portfolio clarity.
- Supabase migration set aligned through reminder preferences schema.
- `send-due-reminders` edge function deployed and active.
- CI + deploy workflows for Vercel and Render.
- Unit and E2E test suites for core flows.

### Security

- RLS enforcement for user-scoped entities.
- DB-level ownership policies (`auth.uid()`).

[Unreleased]: https://github.com/TomasPosada0626/Neuroroutine/compare/v1.0.0...main
[1.0.0]: https://github.com/TomasPosada0626/Neuroroutine/releases/tag/v1.0.0
