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

- `Frontend (lint + test + build)`
- `Frontend E2E (Playwright)`
- `codeql / Analyze`
- `secret-scan / gitleaks`

Add `RLS regression E2E (cross-user attack test)` once the secrets below are configured.

## Enable the RLS cross-user E2E job

`frontend/e2e/routines.spec.ts` includes an automated attack test: it logs in as one user,
creates data, logs in as a second user, and attempts to read/patch/delete the first user's
rows directly over the Supabase REST API using a stolen session token. The `e2e-rls-regression`
job in `ci.yml` runs it on every push/PR, but skips with a warning until these 6 repository
secrets exist (Settings -> Secrets and variables -> Actions -> New repository secret):

| Secret | Value |
|---|---|
| `VITE_SUPABASE_URL` | Same as the app's `VITE_SUPABASE_URL` |
| `VITE_SUPABASE_ANON_KEY` | Same as the app's `VITE_SUPABASE_ANON_KEY` |
| `E2E_USER_A_IDENTIFIER` | Email of a dedicated test account ("User A") |
| `E2E_USER_A_PASSWORD` | Password for User A |
| `E2E_USER_B_IDENTIFIER` | Email of a second dedicated test account ("User B") |
| `E2E_USER_B_PASSWORD` | Password for User B |

Use two throwaway accounts created specifically for this (never real user credentials).
Once all 6 secrets are set, the next CI run automatically executes the real cross-user
mutation-denial test instead of printing the skip warning — no code change needed.

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
