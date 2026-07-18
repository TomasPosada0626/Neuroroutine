# Operational Metrics

This document defines metrics that are actionable for reliability, performance, and product flow health.

## Principles

- Use reproducible metrics only.
- Track trend over single-point values.
- Connect every metric to an owner and an action.

## Reliability Metrics

1. Frontend error rate
   - Definition: `(frontend errors captured by Sentry) / (frontend sessions)`
   - Target: < 1.5% per rolling 7 days
   - Source: Sentry project dashboard

2. Deployment success rate
   - Definition: `(successful deploy workflows) / (total deploy workflows)`
   - Target: >= 95% per 30 days
   - Source: GitHub Actions for deploy workflows

3. CI stability
   - Definition: `(successful CI runs) / (total CI runs)`
   - Target: >= 90% per 30 days
   - Source: GitHub Actions CI workflow

## Performance Metrics

1. Time to interactive (TTI)
   - Target: p75 < 3000 ms on desktop, p75 < 4500 ms on mobile
   - Source: Lighthouse CI or Web Vitals capture

2. API request p95 latency
   - Target: p95 < 600 ms for main app queries
   - Source: Supabase logs / custom app_events timing fields

3. Build duration
   - Target: < 5 minutes per CI run
   - Source: GitHub Actions job duration

## Product Flow Metrics

1. Sign-up completion rate
   - Definition: `(users who finish sign-up) / (users who start sign-up)`
   - Target: >= 70%

2. Activation rate
   - Definition: `(users creating first routine within 24h) / (new users)`
   - Target: >= 55%

3. Habit completion consistency
   - Definition: average weekly completed-days percentage among active users
   - Target: >= 45%

## Minimum Instrumentation

- Ensure key events are present in `app_events`:
  - `routine_created`, `task_created`, `task_completed`, `task_uncompleted`, `tasks_created_bulk`, `task_deleted`
- Add correlation metadata when useful (`flow`, `screen`, `duration_ms`) without PII.
- Keep event payloads sanitized.

## Review Cadence

- Weekly: CI/deploy reliability and major errors.
- Biweekly: flow conversion and activation.
- Monthly: performance budget and architecture follow-ups.
