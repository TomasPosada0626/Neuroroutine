# ADR-005: App-event observability with duration metrics

- Status: Accepted
- Date: 2026-07-18

## Context

The project had event logs and quality gates, but lacked a consistent way to measure latency in critical flows.

## Decision

Use `app_events.meta.duration_ms` as a standard metric field for critical user flows:

- login success,
- routine creation,
- task creation,
- task completion/uncompletion,
- offline sync completion.

The metric is best-effort and privacy-sanitized.

## Consequences

Positive:

- Enables p95-style trend tracking.
- Improves incident triage and performance analysis.
- Provides measurable outcomes for portfolio evidence.

Trade-offs:

- Adds small telemetry overhead.
- Requires dashboards/alerts to consume event data.

## Alternatives considered

- No timing metrics: rejected, insufficient operational visibility.
- Full tracing stack from day one: postponed for MVP complexity/cost; Sentry performance
  tracing was later enabled at a sampled rate (20% in production, 100% in development) once
  the app-event metrics above proved the pattern was worth the added volume.

## References

- [frontend/src/shared/observability/eventLog.ts](../../frontend/src/shared/observability/eventLog.ts)
- [frontend/src/shared/observability/initSentry.ts](../../frontend/src/shared/observability/initSentry.ts)
- [frontend/src/features/auth/authStore.ts](../../frontend/src/features/auth/authStore.ts)
- [frontend/src/features/routines/routinesStore.ts](../../frontend/src/features/routines/routinesStore.ts)
