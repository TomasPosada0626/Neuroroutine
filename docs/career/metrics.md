# CV and LinkedIn Metrics Block

This page captures career-facing project metrics and profile-ready wording.

Important:

- Keep only evidence-based metrics in public profiles.
- If a metric is not measured yet, keep the placeholder and track it before publishing.

## Verified project metrics (from current repository)

- CI quality gates on every push/PR: lint, format check, tests + coverage gate, build, Playwright smoke E2E.
- Test coverage snapshot (2026-07-27, `npm run test:coverage` on Node 24, 363 tests): 96.21% statements, 83.58% branches, 98.15% functions, 98.43% lines. This is measured against every `src/**/*.{ts,tsx}` file (`coverage.include`), not just files a test happens to import — a prior snapshot (94.15%/79.98%/94.97%/96.14%) silently dropped untested files from the denominator instead of counting them as 0%, which overstated the real number. Closing that gap meant adding real unit tests for previously untested logic (auth route guard, form validation, the event logger, drag-and-drop widget ordering, demo-data seeding, and more) rather than just relaxing the measurement.
- Mutation testing: last measured 2026-07-27 at **47.09% mutation score** (993 killed / 1085 survived / 2 timeout out of 2080 covered mutants), re-run after the `features/routines` growth (task editing, postpone, quick-capture, daily-recurring tasks) that made the prior 45.48% snapshot stale. Reported alongside line coverage rather than instead of it: high statement coverage means the code *ran* during tests, mutation score measures whether the assertions would actually *catch* a bug — the two numbers moving in opposite directions (coverage up, mutation score only modestly up) is itself the honest signal that assertion depth, not just line reach, is the next thing to invest in.
- Dual deployment paths: Vercel and Render.
- Security model: Supabase RLS policies scoped by authenticated user identity, verified with an automated cross-user mutation attack test (Playwright).

## CV bullet block

- Built and shipped NeuroRoutine, a React + TypeScript SPA with Supabase Auth/Postgres and row-level security.
- Implemented CI quality gates (lint, format check, unit tests with a coverage gate, build, and Playwright smoke E2E) to reduce regression risk before deployment.
- Maintained measurable test quality with 96.2% statement coverage / 83.6% branch coverage (snapshot, 363 tests, measured against every source file rather than only files a test imports), including feature/store tests for core flows.
- Ran mutation testing (Stryker) to validate assertion quality beyond coverage percentage, surfacing a 47.1% mutation score as a concrete improvement target rather than assuming high coverage meant high test quality.
- Ran an automated accessibility audit (axe-core via Playwright) against the live app across the landing page, login, and the dashboard in four real states, finding and fixing six real WCAG violations (missing landmark/heading structure, unlabeled form controls, a nested interactive control invalid even with `aria-hidden`) — not just testing the shared component library in isolation.
- Wrote an automated Playwright test that steals a real session token and attempts a cross-user mutation over the Supabase REST API, proving RLS policies reject it end-to-end.
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
