# Manual Actions Checklist (GitHub settings)

These actions cannot be fully enforced from repository code only.

## Branch protection for main — DONE (2026-08-20)

Applied live via the GitHub API (`PUT /repos/.../branches/main/protection`), not just documented
here: required status checks (see below), force-push disallowed, branch deletion disallowed,
`required_conversation_resolution` on. `enforce_admins` is deliberately **off** — this is a
solo-maintainer repo where the owner pushes directly to `main`; turning it on would also block the
owner's own pushes unless every change went through a PR with a second approver, which doesn't
exist here. Re-run the same API call (see git history around 2026-08-20) any time the protection
needs to be reapplied or extended.

## Required status checks — DONE, currently set to:

- `Backend (Deno unit tests)`
- `Backend RLS (pgTAP, local Postgres)`
- `Frontend (lint + test + build)`
- `Analyze (javascript-typescript)` (codeql)
- `gitleaks` (secret-scan)
- `Frontend E2E (Playwright)`
- `RLS regression E2E (cross-user attack test)`

All 7 checks are required as of 2026-08-20 (see the next section for how the last two got fixed).

## RESOLVED (2026-08-20): authenticated E2E jobs are blocking again

Both `e2e` and `e2e-rls-regression` in `ci.yml` used to end their real test-running step with
`|| echo "::warning::..."`, so the step (and therefore the job, and the commit's check) reported
green even when the tests inside it failed. That fallback is now removed from both.

**Root cause:** the actual failure was `Invalid login credentials` returned by the Supabase Auth
API itself — not a stuck `/login` page, not GitHub Actions' shared-runner IPs being rate-limited
by Supabase (that was the original working theory; ruled out once the real error message was read
instead of just the symptom). Two things had drifted, discovered in this order:

1. `E2E_USER_PASSWORD` no longer matched the test account's real password in Supabase (reset via
   the app's own `/forgot-password` -> `/reset-password` flow — the Supabase dashboard's
   "Send Password Recovery" button ended up being a dead end here because the production domain
   `https://neuroroutine.vercel.app/reset-password` wasn't in **Authentication -> URL
   Configuration -> Redirect URLs** yet either; both that and a stray trailing dot on the Site URL
   got fixed along the way).
2. Even after that, the job still failed — `E2E_USER_IDENTIFIER` (and `E2E_USER_B_IDENTIFIER`)
   stored in GitHub had themselves drifted from the actual working accounts. Both accounts'
   credentials were verified directly against `POST {SUPABASE_URL}/auth/v1/token?grant_type=password`
   (a plain `curl` with the `apikey` header, no secrets needed beyond the public anon key) before
   resetting the GitHub secrets, to confirm the fix before spending another CI run on a guess.

With both synced, `Frontend E2E (Playwright)` (14 passed, 2 intentionally skipped, 1 flaky-but-
passed-on-retry unrelated UI timing issue in `dashboard-analytics.spec.ts`) and
`RLS regression E2E (cross-user attack test)` (2 passed) ran clean, the `|| echo` fallback was
removed from both jobs, and both were added to the required status checks list above.

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
job in `ci.yml` runs it on every push/PR, but skips with a warning until these repository
secrets exist (Settings -> Secrets and variables -> Actions -> New repository secret). "User A"
in this test **is** the same account as `E2E_USER_IDENTIFIER` above — there is deliberately no
separate `E2E_USER_A_*` secret, because two secrets meant to always hold the identical value
only ever drift out of sync when someone updates one and forgets the other:

| Secret                   | Value                                               |
| ------------------------ | --------------------------------------------------- |
| `VITE_SUPABASE_URL`      | Same as the app's `VITE_SUPABASE_URL`               |
| `VITE_SUPABASE_ANON_KEY` | Same as the app's `VITE_SUPABASE_ANON_KEY`          |
| `E2E_USER_IDENTIFIER`    | Same account as the main E2E suite above ("User A") |
| `E2E_USER_PASSWORD`      | Same as above                                       |
| `E2E_USER_B_IDENTIFIER`  | Email of a second dedicated test account ("User B") |
| `E2E_USER_B_PASSWORD`    | Password for User B                                 |

Use two throwaway accounts created specifically for this (never real user credentials).
Once these secrets are set, the next CI run automatically executes the real cross-user
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

## pgTAP tests for RLS policies at the SQL layer

`backend/supabase/tests/database/routines_rls.test.sql` is a secret-free, SQL-level RLS suite
(11 assertions: cross-user SELECT/UPDATE/DELETE/INSERT denial plus positive-control checks that
the owning user can still do all of the above) that runs in the `backend-rls` CI job on every
push — no secrets needed, since it boots a throwaway local Postgres via the Supabase CLI and
tears it down after. It's a second, faster line of defense on top of
`e2e-rls-regression`'s real cross-user Playwright attack test (which goes through the actual
PostgREST + JWT path but only runs once its 6 secrets are configured).

Two real gaps this surfaced along the way, now fixed:

- **`migrations/` wasn't replayable from an empty database.** Migrations 0001+ were incremental
  `ALTER TABLE` statements that silently assumed `routines`/`routine_tasks`/`profiles` already
  existed from a pre-migrations-era manual `schema.sql` run — a fresh `supabase start` failed
  immediately on migration 0001. Fixed by adding `migrations/0000_baseline_schema.sql` (a verbatim,
  fully idempotent copy of `schema.sql`), so the migration history is now self-sufficient. This
  file is what actually got the local dev stack running in the first place, independent of pgTAP.
- **A local/CI Postgres has no table-level GRANTs to `authenticated`/`anon`** the way a real
  Supabase Cloud project does automatically when a schema is exposed to the API. Without them,
  RLS never even gets a chance to filter — every query fails with a bare "permission denied"
  first. The test file grants `select, insert, update, delete` on the two tables it exercises,
  scoped to its own transaction (rolled back at the end, never persisted).

If you ever see `supabase test db` hang locally, it's a known flakiness in this environment tied
to the `supabase_vector` log-shipping container crash-looping — the CI job and the command used
to verify this suite locally both call `psql` directly against the started stack instead of going
through that wrapper.

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
