# Security Controls Gap Analysis

## Implemented now

- CSP and baseline security headers (now including `Strict-Transport-Security`)
- Dependency automation and code scanning
- Security policy and hardening checklist
- Shared-secret authentication on the `send-due-reminders` edge function (closed a critical gap
  where any holder of the public anon key could trigger real emails on demand — see
  `hardening.md` threat model item 8)
- Server-side rate limiting for `get_email_by_username`, keyed by a client IP that cannot be
  spoofed via `x-forwarded-for` (fixed 2026-08-14 — see `hardening.md` threat model item 6)

## Pending controls and status

1. Helmet
   - Status: not applicable in current frontend-static architecture.
   - Alternative: enforce equivalent headers at edge/server (Vercel + Nginx config already added).

2. Rate limiting
   - Status: implemented for `get_email_by_username` (8 calls/min per client IP, enforced inside
     the RPC via a `rpc_rate_limits` table — migration `0007_rate_limit_get_email_by_username`,
     IP-spoofing fix in `0013_fix_rate_limit_ip_spoofing`), on top of the existing timing-side-
     channel mitigation (see `hardening.md`). The `send-due-reminders` edge function is no longer
     an open endpoint (see Implemented now) but still has no per-caller rate limit of its own
     beyond the shared-secret gate — low priority since only the cron job holds the secret.
     Login itself (`signInWithPassword`) still has no app-level lockout/backoff, relying only on
     Supabase Auth's own built-in protections — not yet verified against this project's actual
     Supabase dashboard configuration.
   - Alternative: add the same pattern (or an edge/gateway-level limiter) when write APIs expand.

3. Refresh token rotation
   - Status: confirmed enabled (`enable_refresh_token_rotation = true` in
     `backend/supabase/config.toml`).
   - Action: periodically review Supabase auth/session settings; no code action needed.

4. Secret scanning
   - Status: implemented (`.github/workflows/secret-scan.yml`, Gitleaks, runs on every push/PR).

5. Complete RLS regression
   - Status: pgTAP suite (`backend/supabase/tests/database/routines_rls.test.sql`) expanded
     2026-08-14 from 11 to 24 assertions — previously only covered `routines`/`routine_tasks`
     despite the file's own header claiming `routine_task_events` too. Now also covers
     `routine_task_events` (including that it's append-only, even for the owner),
     `reminder_preferences`, `app_events`, and `profiles` cross-user select/update/delete/insert-
     spoof attempts. Combined with the existing Playwright cross-user E2E attack test
     (`frontend/e2e/routines.spec.ts`).
