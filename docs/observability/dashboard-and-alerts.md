# Operational Dashboard and Alerts

## Goal

Make observability operational (not only documented) with visible dashboards and actionable alerts.

## Minimum live dashboard

Track these metrics continuously:

1. Frontend error rate (24h)
2. Deploy success rate (30d)
3. CI stability (30d)
4. p95 flow duration from app events (`duration_ms`)

## Data sources

1. Sentry
	- Source for frontend error rate.
2. GitHub Actions
	- Source for CI stability and deploy success rate.
3. Supabase SQL (table `app_events`)
	- Source for p95 flow duration and event counts.

## Dashboard implementation

### Panel 1: Error rate (24h)

- Tool: Sentry dashboard widget.
- Metric: `error events / sessions` over 24h.
- Suggested title: `Frontend error rate (24h)`.

### Panel 2: Deploy success rate (30d)

- Tool: GitHub Actions insights or external dashboard reading workflow runs.
- Definition: `(successful deploy workflow runs) / (total deploy workflow runs)` in last 30 days.
- Suggested title: `Deploy success rate (30d)`.

### Panel 3: CI stability (30d)

- Tool: GitHub Actions insights.
- Definition: `(successful CI runs) / (total CI runs)` in last 30 days.
- Suggested title: `CI stability (30d)`.

### Panel 4: p95 duration_ms

- Tool: Supabase SQL dashboard/query.
- Query reference: `docs/observability/supabase-queries.sql`.
- Suggested title: `p95 flow duration (24h)`.

## Suggested dashboard blocks

- Reliability: error rate, failed deploys, failed CI runs.
- Performance: p95 login, p95 routine create, p95 task complete.
- Product flow: routine created count, task completion count.

## Alert thresholds (starter)

1. Error rate > 2.0% in 24h
2. CI stability < 90% in rolling 30d
3. Deploy success rate < 95% in rolling 30d
4. p95 login duration > 1800ms for 24h

## Alert routing and response

1. Route alerts to email/Slack used by maintainers.
2. Open incident issue when an alert threshold is breached.
3. Fill postmortem document after mitigation.

## Evidence requirements

To consider this pillar complete, keep evidence in the repository:

1. Dashboard screenshot links or captures.
2. At least one incident record (simulated or real).
3. A filled postmortem file.

Reference evidence file:

- `docs/observability/evidence-2026-07-18.md`

## Ownership and response

- Owner: project maintainer
- Response target: acknowledge within 24h
- Every alert breach should create an issue tagged `incident` or `ops`
