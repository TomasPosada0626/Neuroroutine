# Performance Budget

## Frontend budget (target)

1. JavaScript payload
   - Initial JS (gzip): <= 280 kB
   - Any single chunk (gzip): <= 170 kB

2. CSS payload
   - Initial CSS (gzip): <= 25 kB

3. Runtime UX targets
   - p75 FCP desktop: <= 1800 ms
   - p75 TTI desktop: <= 3000 ms
   - p95 routine create duration: <= 800 ms
   - p95 task complete duration: <= 600 ms

## Build/CI targets

- CI build duration: <= 5 minutes
- Main branch lint/build failures: 0 tolerated in normal operation windows

## Enforcement cadence

- Weekly review from CI artifacts and app events.
- Open issue when a budget is exceeded for 2 consecutive runs.

## Action playbook when exceeded

1. Identify the largest changed bundle/module.
2. Split lazy-loaded sections where possible.
3. Remove dead code/dependencies.
4. Re-measure before merge.
