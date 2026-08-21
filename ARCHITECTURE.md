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
- `features` can import from `shared`, but not from other feature internals —
  **except `features/auth`**: nearly every feature needs to know the current user's identity, so
  treating auth as a second cross-cutting layer (alongside `shared`) is an intentional,
  documented exception rather than a violation. `routines` importing `useAuth` from
  `features/auth/authStore` is expected; a feature reaching into another *non-auth* feature's
  internals (e.g. `routines` importing `dashboard`'s store directly) is not — that state either
  belongs in `shared/state` or the dependency should be inverted (pass data in via props/params
  instead of importing the other feature's store).
- `pages` can compose from `features` and `shared`, but should not hold business logic.
- `app` can import from all frontend layers and is the top-level orchestrator.

## State ownership

- Global cross-feature UI state belongs in `src/shared/state`.
- Feature-specific state belongs inside each feature folder.
- Authentication session state is owned by `features/auth`.

## Backend ownership

- Full schema source of truth: `backend/supabase/schema.sql`.
- Incremental evolution: `backend/supabase/migrations/`.
- Keep both aligned after every schema change. Enforced, not just documented: a CI job
  (`schema.sql version matches latest migration` in `.github/workflows/ci.yml`) fails the build
  if `schema.sql`'s declared `nr_schema_meta` version doesn't match the highest-numbered file in
  `migrations/`.

## Schema/API compatibility policy

- Migrations are additive-only: no `DROP COLUMN`/`DROP TABLE`/type-narrowing changes against a
  column or table an existing deployed frontend build still reads or writes. This has held for
  every migration to date (verified by grep across `migrations/` — see the audit referenced in
  `CHANGELOG.md`) and is the actual mechanism that lets an old and a new frontend build coexist
  against the same database during a deploy, not just a convention.
- A column/table that's genuinely no longer needed is stopped being read/written by the frontend
  first, left in place for at least one release, and only dropped in a later, explicitly-labeled
  migration once nothing references it - never in the same change that stops using it.
- RPC function signatures (`get_email_by_username`, `search_routines`, `delete_own_account`,
  `reset_recurring_tasks`, `get_nr_schema_status`) are additive-only the same way: new optional
  parameters are fine, removing or narrowing an existing parameter/return shape is a breaking
  change and needs the same deprecation window as a column.
- Already-applied migrations are never edited in place, even to fix a bug in them - fix forward
  with a new migration instead. Case in point: migrations 0010 and 0012 hardcoded this project's
  own Supabase URL directly into a `cron.schedule()` call, which would have misdirected a cron job
  scheduled from a fresh copy of these migrations against a different Supabase project onto this
  one's production database. Rather than editing those two files, `0018_parametrize_reminder_cron_url.sql`
  supersedes just the `cron.schedule()` call with one that reads the URL from Supabase Vault
  instead of a literal, following the same "fails loud if unconfigured" pattern already used for
  the service-role-key secret.

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
