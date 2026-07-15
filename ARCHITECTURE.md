# Architecture Guide

This document defines architecture boundaries and maintenance rules for NeuroRoutine.

## System model

- Frontend: React + Vite SPA in `frontend/`
- Backend: Supabase (Auth + Postgres + RLS) in `backend/supabase/`
- Deploy: Vercel (primary) and Render (fallback)

## Frontend layering

- `src/main.tsx`: runtime bootstrap, env guards, global initialization.
- `src/app/`: app-level router and composition.
- `src/pages/`: route-level UI composition.
- `src/features/`: feature logic (state, service layer, feature components).
- `src/shared/`: reusable cross-feature modules (api, ui, layout, utilities, state).

## Dependency rules

- `shared` cannot import from `features` or `pages`.
- `features` can import from `shared`, but not from other feature internals.
- `pages` can compose from `features` and `shared`, but should not hold business logic.
- `app` can import from all frontend layers and is the top-level orchestrator.

## State ownership

- Global cross-feature UI state belongs in `src/shared/state`.
- Feature-specific state belongs inside each feature folder.
- Authentication session state is owned by `features/auth`.

## Backend ownership

- Full schema source of truth: `backend/supabase/schema.sql`.
- Incremental evolution: `backend/supabase/migrations/`.
- Keep both aligned after every schema change.

## Security model

- Frontend uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` only.
- Never expose Supabase `service_role` key in frontend code or env files.
- Data access is enforced through RLS policies in Postgres.

## Environment boundaries

- Frontend runtime env vars go in `frontend/.env.local` (or `frontend/.env`).
- Root `.env.local` is tooling scope (for example Vercel CLI) and not frontend runtime.

## Testing strategy

- Unit/store tests: Vitest.
- End-to-end smoke: Playwright.
- CI quality gates: lint, tests, build, E2E smoke.

## Feature addition checklist

1. Add domain types/schemas within the feature.
2. Add service/store logic in the same feature.
3. Keep page components thin; compose feature modules.
4. Add tests for store/service behavior.
5. Update docs if runtime/deploy requirements change.

## Change management rules

- Avoid cross-layer shortcuts and deep relative imports.
- Keep public API through barrels where available.
- Prefer small, reviewable changes that preserve behavior.
- Update this document when architecture rules evolve.
