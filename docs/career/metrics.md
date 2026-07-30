# CV and LinkedIn Metrics Block

This page captures career-facing project metrics and profile-ready wording.

Important:

- Keep only evidence-based metrics in public profiles.
- If a metric is not measured yet, keep the placeholder and track it before publishing.

## Verified project metrics (from current repository)

- CI quality gates on every push/PR: backend Deno unit tests, a secret-free pgTAP RLS suite against a throwaway local Postgres, frontend lint, format check, tests + coverage gate, build, bundle-size budget, Playwright E2E, CodeQL (SAST), and Gitleaks secret scanning.
- Test coverage snapshot (2026-07-30, `npm run test:coverage` on Node 24, 597 tests across 51 files): 98.38% statements, 92.67% branches, 100% functions, 100% lines. Measured against every `src/**/*.{ts,tsx}` file (`coverage.include`), not just files a test happens to import. This snapshot closes the last remaining unit-test gap in the frontend: the four auth pages (Login/Register/Forgot/Reset password) previously had zero unit coverage by design (relying solely on E2E); they now have dedicated tests covering validation, success/error paths, Google sign-in, and both themes, and are no longer excluded from the coverage measurement.
- Mutation testing: last measured 2026-07-30 at **77.03% mutation score** (644 killed / 189 survived / 3 no-coverage out of 833 covered mutants), up from a 46.48% snapshot the same day. That prior number was itself measured on a broken config: the `mutate` glob also matched the test files themselves (`__tests__/*.test.ts`), so Stryker was mutating test code and counting those meaningless mutants as survivors, silently depressing the reported score. Fixing that glob, removing a genuinely-dead-code Zod pattern it surfaced (`.or(z.literal(''))` after `z.string()`, which already accepts `''` on its own), and strengthening assertions (exact `toHaveBeenCalledWith` checks on the Supabase query-builder chain and on fire-and-forget analytics calls, multi-item fixtures so filter/map/find mutants can't hide behind a single-element array, and explicit coverage of every `instanceof Error` branch) raised the real number by +30.5 points.
- Backend RLS is verified two independent ways: a real cross-user attack test in Playwright (goes through the actual PostgREST + JWT path) and an 11-assertion pgTAP suite at the SQL layer that runs secret-free in CI on every push. Building the pgTAP suite surfaced and fixed a real gap: the migrations directory couldn't bootstrap an empty database on its own (incremental migrations assumed tables that only `schema.sql` created) — fixed with a baseline migration so `supabase start`/`db reset` now works from scratch.
- Dual deployment paths: Vercel and Render.
- Security model: Supabase RLS policies scoped by authenticated user identity, verified with an automated cross-user mutation attack test (Playwright) plus a secret-free pgTAP suite in CI.

## CV bullet block

- Built and shipped NeuroRoutine, a React + TypeScript SPA with Supabase Auth/Postgres and row-level security.
- Implemented CI quality gates (backend unit tests, a secret-free pgTAP RLS suite, lint, format check, frontend unit tests with a coverage gate, build, bundle-size budget, and Playwright E2E) to reduce regression risk before deployment.
- Maintained measurable test quality with 98.4% statement coverage / 92.7% branch coverage (snapshot, 597 tests across 51 files, measured against every source file rather than only files a test imports), including feature/store tests for core flows.
- Ran mutation testing (Stryker) to validate assertion quality beyond coverage percentage; found and fixed a configuration bug that was mutating test files themselves and silently depressing the score, then raised it from 46.5% to 77.0% by strengthening assertions and removing a dead-code pattern the tool surfaced.
- Ran an automated accessibility audit (axe-core via Playwright) against the live app across the landing page, login, and the dashboard in four real states, finding and fixing six real WCAG violations (missing landmark/heading structure, unlabeled form controls, a nested interactive control invalid even with `aria-hidden`) — not just testing the shared component library in isolation.
- Wrote an automated Playwright test that steals a real session token and attempts a cross-user mutation over the Supabase REST API, proving RLS policies reject it end-to-end, plus a second SQL-layer pgTAP suite that verifies the same policies without needing any secrets, catching a real migration-bootstrap gap along the way.
- Refactored a 3,200-line dashboard page by extracting its analytics/business logic into pure, independently unit-tested functions in the feature layer, cutting the page to under 2,500 lines without changing its rendered output.
- Designed resilient delivery with dual production deployment options (Vercel primary, Render fallback).
- Enforced per-user data isolation at the database layer through RLS policies (`auth.uid()` ownership checks).

## LinkedIn project summary

Built NeuroRoutine as a production-style portfolio app focused on secure multi-user data handling and operational reliability. The project uses React + TypeScript + Supabase (Auth + Postgres + RLS), runs CI gates on every push/PR (lint, tests, build, Playwright smoke E2E, and an automated cross-user RLS attack test), and supports dual deployment on Vercel and Render. This let me practice end-to-end product delivery, from UX and feature architecture to database security and release workflows.

## Keeping this file honest

This file and the "Testing & Quality" section of the root `README.md` must always report the same coverage and mutation-score snapshot. If they ever diverge, re-run `npm run test:coverage` and `npm run test:mutation` in `frontend/` and update both together — never publish a number here that the repository's own tests don't currently produce.

## Optional product metrics placeholders

Replace these only when measured with tooling/analytics:

- Registration conversion: [x%] from landing to completed sign-up.
- Activation: [x%] users who create first routine within 24h.
- Retention: [x%] weekly returning users.
- Performance: [x ms] median page load / [x ms] TTI.
- Reliability: [x%] successful deployment rate.

## How to keep this updated

1. Update this file after significant releases.
2. Keep only values you can reproduce from CI, analytics, or logs.
3. Mirror final polished bullets into your CV and LinkedIn profile.
