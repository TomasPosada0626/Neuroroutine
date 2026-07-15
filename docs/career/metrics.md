# CV and LinkedIn Metrics Block

Use this page as your copy/paste source for career-facing project descriptions.

Important:

- Keep only evidence-based metrics in public profiles.
- If a metric is not measured yet, keep the placeholder and track it before publishing.

## Verified project metrics (from current repository)

- CI quality gates on every push/PR: lint, tests, build, Playwright smoke E2E.
- Test coverage snapshot (2026-02-06): 52.6% statements, 34.44% branches, 48.14% functions, 53.52% lines.
- Dual deployment paths: Vercel and Render.
- Security model: Supabase RLS policies scoped by authenticated user identity.

## CV bullet block (copy/paste)

- Built and shipped NeuroRoutine, a React + TypeScript SPA with Supabase Auth/Postgres and row-level security.
- Implemented CI quality gates (lint, unit tests, build, and Playwright smoke E2E) to reduce regression risk before deployment.
- Maintained measurable test quality with 52.6% statement coverage (snapshot), including feature/store tests for core flows.
- Designed resilient delivery with dual production deployment options (Vercel primary, Render fallback).
- Enforced per-user data isolation at the database layer through RLS policies (`auth.uid()` ownership checks).

## LinkedIn project summary (copy/paste)

Built NeuroRoutine as a production-style portfolio app focused on secure multi-user data handling and operational reliability. The project uses React + TypeScript + Supabase (Auth + Postgres + RLS), runs CI gates on every push/PR (lint, tests, build, Playwright smoke E2E), and supports dual deployment on Vercel and Render. This let me practice end-to-end product delivery, from UX and feature architecture to database security and release workflows.

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
