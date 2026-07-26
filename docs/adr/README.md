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
