# Performance Budget

## Frontend budget (target)

1. JavaScript payload
   - Initial JS (gzip): <= 280 kB
   - Any single chunk (gzip): <= 170 kB

2. CSS payload
   - Initial CSS (gzip): <= 25 kB

JS/CSS budgets above are enforced automatically: `frontend/scripts/check-bundle-budget.mjs`
runs after every CI build (`npm run build:check-budget`) and fails the build if exceeded — not a
manual weekly check. Runtime UX targets (below) are now measured automatically too; see
Enforcement cadence.

3. Runtime UX targets
   - p75 FCP desktop: <= 1800 ms
   - p75 TTI desktop: <= 3000 ms
   - p95 routine create duration: <= 800 ms
   - p95 task complete duration: <= 600 ms

## Build/CI targets

- CI build duration: <= 5 minutes
- Main branch lint/build failures: 0 tolerated in normal operation windows

## Enforcement cadence

- JS/CSS bundle budgets: automated, every CI run (see above) — a regression fails the build
  immediately, not on a weekly cadence.
- Runtime UX targets (FCP/TTI): automated via Lighthouse CI on every CI run against the built
  `frontend/dist` output (`frontend/lighthouserc.json`, wired into the `frontend` job in
  `.github/workflows/ci.yml`), desktop preset. Currently `warn`-severity (informational, does
  not fail the build) until a few weeks of runs confirm the thresholds hold reliably on GitHub's
  shared runners; promote to `error` in `lighthouserc.json` once that baseline exists.
- Action latency targets (routine create / task complete): automated as of migration 0019 —
  `.github/workflows/action-latency-check.yml` runs weekly and computes real p95s from
  `app_events.meta.duration_ms` (already logged by `routinesStore.ts` for both events) via the
  `get_action_latency_p95()` RPC, failing the job if either exceeds its budget. Lighthouse can't
  cover this on its own since it doesn't exercise authenticated in-app interactions, so this is a
  separate check against real production usage data instead of a synthetic page load.
  Open an issue when any target is exceeded for 2 consecutive weekly runs.

## Action playbook when exceeded

1. Identify the largest changed bundle/module.
2. Split lazy-loaded sections where possible.
3. Remove dead code/dependencies.
4. Re-measure before merge.
