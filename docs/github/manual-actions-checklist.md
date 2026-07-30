# Manual Actions Checklist (GitHub settings)

These actions cannot be fully enforced from repository code only.

## Branch protection for main

1. Settings -> Branches -> Add rule for `main`.
2. Require pull request before merging.
3. Require status checks to pass before merging.
4. Require conversation resolution before merging.
5. Disallow force pushes.
6. Disallow deletions.

## Required status checks

Set these as required:

- `Backend (Deno unit tests)`
- `Frontend (lint + test + build)`
- `Frontend E2E (Playwright)`
- `codeql / Analyze`
- `secret-scan / gitleaks`

Add `RLS regression E2E (cross-user attack test)` once the secrets below are configured.

## Enable the authenticated E2E suite (dashboard, routines CRUD, accessibility, analytics)

Without secrets, the `e2e` job in `ci.yml` only runs the 2 unauthenticated smoke tests (landing
page nav, forgot-password's generic confirmation message) — everything else in
`dashboard-accessibility.spec.ts`, `dashboard-analytics.spec.ts`, `routines.spec.ts` and the
authenticated part of `smoke.spec.ts` is `test.skip`'d. Set these 4 repository secrets to turn
that on:

| Secret                   | Value                                      |
| ------------------------ | ------------------------------------------ |
| `VITE_SUPABASE_URL`      | Same as the app's `VITE_SUPABASE_URL`      |
| `VITE_SUPABASE_ANON_KEY` | Same as the app's `VITE_SUPABASE_ANON_KEY` |
| `E2E_USER_IDENTIFIER`    | Email of a dedicated test account          |
| `E2E_USER_PASSWORD`      | Password for that test account             |

Use a throwaway account created specifically for this (never a real user's credentials) — these
specs create and delete real routines/tasks prefixed `E2E %` / `A11y %` in it.

## Enable the RLS cross-user E2E job

`frontend/e2e/routines.spec.ts` includes an automated attack test: it logs in as one user,
creates data, logs in as a second user, and attempts to read/patch/delete the first user's
rows directly over the Supabase REST API using a stolen session token. The `e2e-rls-regression`
job in `ci.yml` runs it on every push/PR, but skips with a warning until these 6 repository
secrets exist (Settings -> Secrets and variables -> Actions -> New repository secret):

| Secret                   | Value                                               |
| ------------------------ | --------------------------------------------------- |
| `VITE_SUPABASE_URL`      | Same as the app's `VITE_SUPABASE_URL`               |
| `VITE_SUPABASE_ANON_KEY` | Same as the app's `VITE_SUPABASE_ANON_KEY`          |
| `E2E_USER_A_IDENTIFIER`  | Email of a dedicated test account ("User A")        |
| `E2E_USER_A_PASSWORD`    | Password for User A                                 |
| `E2E_USER_B_IDENTIFIER`  | Email of a second dedicated test account ("User B") |
| `E2E_USER_B_PASSWORD`    | Password for User B                                 |

Use two throwaway accounts created specifically for this (never real user credentials).
Once all 6 secrets are set, the next CI run automatically executes the real cross-user
mutation-denial test instead of printing the skip warning — no code change needed.

## Enable the real password-reset E2E test

`frontend/e2e/password-reset.spec.ts` mints a real Supabase recovery link via the Admin API
(no inbox needed) and drives the actual `/reset-password` "set a new password" flow — the one
part of password recovery no other automated test touches. Requires:

| Secret                                      | Value                                                                                                           |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `E2E_SUPABASE_SERVICE_ROLE_KEY`             | The project's `service_role` key (Settings -> API) — **never** expose this to the frontend, only to this CI job |
| `E2E_USER_IDENTIFIER` / `E2E_USER_PASSWORD` | Same throwaway test account as above (its password gets reset and restored by the test)                         |

Also add this app's E2E preview origin (e.g. `http://localhost:4173/reset-password`, or CI's
actual base URL) to **Authentication -> URL Configuration -> Redirect URLs** in the Supabase
dashboard — GoTrue refuses to redirect a recovery link anywhere not on that allowlist, so the
test 404s/skips-equivalent-fails without it even with the secret set correctly.

## Follow-up: pgTAP tests for RLS policies at the SQL layer

`backend/supabase/schema.sql` has no automated test harness of its own today — RLS is currently
verified only through `frontend/e2e/routines.spec.ts`'s real cross-user attack test, which is a
genuine end-to-end proof (it goes through the actual PostgREST + JWT path production traffic
uses) but requires the secrets above to run. A SQL-level pgTAP suite would add a second, faster,
secret-free layer of protection that runs on every push instead of only when E2E secrets exist.
Not implemented in this pass because it needs Docker to pull the full local Supabase stack
(Postgres + GoTrue + PostgREST + Kong, several GB) from scratch — no images were cached in this
environment, so a first run's pull time is unpredictable. To add it:

1. `cd backend/supabase && npx supabase init` (creates `config.toml`; migrations/functions dirs
   are auto-detected, nothing else changes).
2. `npx supabase start` — pulls images on first run, then boots local Postgres with the schema
   already applied from `migrations/*.sql`.
3. Write test files under `backend/supabase/tests/database/*.test.sql` using pgTAP assertions
   (`results_eq`, `throws_ok`, etc.), e.g. asserting that setting
   `request.jwt.claims` to user A's `sub` and querying `routines` never returns user B's rows.
4. `npx supabase test db` runs them locally.
5. Add a CI job to `ci.yml` (`services: postgres` or `supabase start` in the runner) that runs
   `supabase test db` on every push — no secrets needed, since it uses a local, throwaway database.

## Milestones

Create milestones using [docs/github/milestones-plan.md](./milestones-plan.md):

- v1.0.1 - Security and quality hardening
- v1.1.0 - Reliability and experience
- v1.2.0 - Product differentiation

## Release tags

Create real tags only after changelog is ready:

```bash
git tag -a v1.0.1 -m "Release v1.0.1"
git push origin v1.0.1

git tag -a v1.1.0 -m "Release v1.1.0"
git push origin v1.1.0
```
