# Architecture Decision Records (ADR)

This folder stores architecture decisions that have long-term impact on the project.

## Index

- ADR-001: [Feature-first frontend layering](./ADR-001-feature-first-layering.md)
- ADR-002: [Supabase as backend platform with RLS-first authorization](./ADR-002-supabase-rls-first.md)
- ADR-003: [Zustand for domain state and React Query for server state](./ADR-003-zustand-plus-react-query.md)
- ADR-004: [Dual deployment strategy (Vercel primary, Render fallback)](./ADR-004-dual-deploy-vercel-render.md)
- ADR-005: [App-event observability with duration metrics](./ADR-005-observability-event-metrics.md)
- ADR-006: [Offline queue with eventual consistency for task creation](./ADR-006-offline-queue-eventual-consistency.md)
- ADR-007: [Quality gates and commit hygiene baseline](./ADR-007-quality-gates-and-commit-hygiene.md)
- ADR-008: [Daily-recurring tasks via client-triggered reset (not a cron job)](./ADR-008-recurring-tasks-daily-reset.md)
- ADR-009: [One-day "streak freeze" grace tolerance for the current streak](./ADR-009-streak-freeze-grace-day.md)
- ADR-010: [Client-only browser notifications as a fallback before real email/push reminders](./ADR-010-client-only-fallback-notifications.md)
- ADR-011: [Optional per-task weekly cadence for recurring tasks](./ADR-011-weekly-recurring-tasks.md)
- ADR-012: [Real email reminders via Resend from the existing Edge Function](./ADR-012-resend-email-reminders.md)
- ADR-013: [Schedule send-due-reminders via pg_cron + pg_net, not the Dashboard UI](./ADR-013-scheduled-reminders-pg-cron.md)

## ADR status model

- `Accepted`: current standard and expected default.
- `Superseded`: no longer active due to a newer ADR.
- `Proposed`: under discussion, not active yet.

## ADR template (short)

1. Context
2. Decision
3. Consequences
4. Alternatives considered
5. References
