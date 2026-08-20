# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Individuals building and sustaining daily routines across study, fitness, and work contexts
(the landing page's own use-case framing: Estudio / Fitness / Trabajo). Spanish-speaking, using
the app on both desktop and mobile browsers, often installing it as a PWA. They check in daily:
adding tasks, checking items off, and glancing at streak/consistency feedback. Design work targets
these end users; instructors/recruiters evaluating the underlying engineering are a documentation
audience (README/GitHub), not a design audience (confirmed).

## Product Purpose

NeuroRoutine helps people build and keep daily routines: CRUD over routines and tasks, recurring
habit tracking (daily or specific weekdays), streak-based consistency feedback that forgives a
single missed day, and reminders (browser notification + scheduled email) so tasks don't silently
slip. Success is a user who keeps coming back and keeps their streak alive without the app feeling
punishing when real life interrupts a routine.

## Positioning

Security-first trust (confirmed): authorization is enforced at the Postgres layer via Row-Level
Security, not only in application code, so a user's routines, tasks, and completion history are
provably isolated from every other user even if frontend requests are manipulated. This is the
claim a neighboring habit/task tracker (Todoist, Habitica, Notion-based trackers) could not
truthfully copy without the same database-enforced model. Design and copy should be able to
surface this trust claim (e.g. in security/privacy-adjacent moments) without overstating it into
marketing language the product doesn't back up.

## Operating Context

- Responsive web SPA, used on both desktop and mobile browsers; installable as a PWA.
- Daily-use loop: quick-capture a task (Hoy / Mañana / pick a date chips next to an always-visible
  quick-add input) without opening the full routine wizard, check tasks off, view dashboard
  streak/consistency widgets.
- Recurring tasks (habits) reset their checkbox each local day, optionally restricted to specific
  weekdays.
- Reminders arrive two ways: same-session local browser notifications (client-only fallback), and
  scheduled summary emails (via Resend) sent hourly by a `pg_cron` job, gated by each user's own
  configured reminder hour/timezone.
- Offline-first: task actions queue in IndexedDB when the network is unavailable.
- Built as a university practicum MVP; deliberately narrow scope in favor of finished
  fundamentals over feature volume (see Roadmap/Known Limitations in README.md).

## Capabilities and Constraints

- **Auth:** email/password via Supabase Auth; protected `/app` routes; session persistence and
  logout.
- **Routines & tasks:** full CRUD, including task editing (title/description/date-time/recurring
  flag), "postpone to tomorrow", bulk task creation via a routine wizard.
- **Consistency mechanics:** event-log-driven streak calculation; "streak freeze" grace day — one
  missed day doesn't reset the streak, two consecutive missed days do.
- **Reminders:** local browser notification fallback (same-session, same-day) + scheduled email
  (Resend, hourly cron, per-user hour/timezone). Web push exists as a schema field
  (`reminder_preferences.push_enabled`) with no subscription flow or server trigger yet — not a
  shipped capability.
- **Search:** routine search waterfalls Postgres RPC → full-text search → `ilike` fallback.
- **Offline:** IndexedDB-backed task queue; installable PWA with app-shell caching.
- **Explicitly not yet built:** task reordering (drag-and-drop dependency installed, not wired),
  profile editing beyond the basics, analytics export (CSV/PDF), real-time sync.
- **Terminology:** "routine" = a named collection of tasks; "task" = an item that can optionally
  be recurring (a habit) with an optional weekly cadence; "streak freeze"; "quick-capture".
- **Undecided:** stack is fixed by the existing codebase (React 19, TypeScript, Vite, Tailwind
  CSS, Supabase, Zustand, React Hook Form + Zod) — not an open product decision.

## Brand Commitments

Locked (confirmed) — preserve unless the user explicitly changes them:

- Product name: **NeuroRoutine**.
- Spanish-first UI copy (e.g. "Estudio / Fitness / Trabajo", "Hoy / Mañana", "Posponer").
- Existing visual language: slate neutrals with a cyan-to-violet gradient accent, plus a day/night
  theme toggle, as seen on the current landing page.

## Evidence on Hand

- Live demo: https://neuroroutine.vercel.app/
- `README.md` documents features, architecture, testing strategy, and roadmap in depth.
- ADRs in `docs/adr/`: recurring-task daily reset (ADR-008), streak-freeze grace day (ADR-009),
  client-only fallback notifications (ADR-010), weekly recurring tasks (ADR-011), Resend email
  reminders (ADR-012), automatic daily cron schedule (ADR-013).
- No testimonials, customer names, benchmarks, or pricing exist; future work must not fabricate
  them.

## Product Principles

1. Trust is enforced at the data layer, not the UI — never let design imply security lives only
   in the frontend; RLS is the credibility the product actually has.
2. Consistency should feel forgiving, not punishing — one missed day is recoverable by design
   (streak freeze), and the UI should reflect grace rather than an all-or-nothing streak count.
3. Keep the fast path fast — quick-capture chips and an always-visible quick-add input exist so a
   user never has to open the full routine wizard just to jot down a task.
4. Spanish-first voice throughout — copy is written for real daily use in Spanish, not as an
   untranslated placeholder.
5. Engineering fundamentals over feature volume — the product deliberately stays narrow; design
   work should favor polish and clarity over adding new surface area.

## Accessibility & Inclusion

Automated accessibility scans (axe-core) run as real Playwright E2E tests against the live app —
landing, login, and multiple dashboard states, including color contrast — not just against a
shared UI kit in isolation; six real violations were previously found and fixed this way. No
specific named standard (e.g. a WCAG conformance level) is committed to beyond axe's rule set;
treat "axe-clean across real app states" as the working bar unless the user names a specific WCAG
level.
