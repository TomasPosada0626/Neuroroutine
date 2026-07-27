# OWASP-Aligned Checklist

This checklist tracks practical controls aligned with common OWASP risks.

## A01 Broken Access Control

- [x] RLS per-user ownership in Postgres.
- [x] Protected routes in frontend.
- [x] Automated multi-user mutation regression tests in CI (`e2e/routines.spec.ts`, "RLS
      regression" suite: cross-user read isolation + cross-user PATCH/DELETE denial), gated on
      `E2E_USER_A/B_*` secrets and skipped with a CI warning (not a silent pass) when absent.

## A02 Cryptographic Failures

- [x] Auth and tokens managed by Supabase.
- [ ] Verify production transport and cookie/session settings periodically.

## A03 Injection

- [x] Supabase query APIs and schema validation usage.
- [x] React escaping by default in UI rendering.

## A04 Insecure Design

- [x] ADRs and architecture guardrails documented.
- [ ] Add threat-model review cadence every major release.

## A05 Security Misconfiguration

- [x] CSP and security headers configured for Vercel/Nginx.
- [x] Branch protection on `main` requires changes through a pull request (owner retains bypass,
      expected for a solo-maintained repository).

## A06 Vulnerable and Outdated Components

- [x] Dependabot and npm audit workflow in use.
- [x] CodeQL enabled.

## A07 Identification and Authentication Failures

- [x] Supabase Auth-based flows.
- [x] New-account password minimum raised to 10 characters; username-login lookup performs a
      timing-equalized dummy auth call to reduce user-enumeration via response time.
- [ ] Review redirect URLs/session settings and bot resistance.
- [x] Server-side rate limiting on `get_email_by_username` (8 calls/min per client IP, enforced
      inside the RPC itself — migration `0007_rate_limit_get_email_by_username`). Limit is IP-keyed,
      so it doesn't stop enumeration spread across many IPs; revisit if that's observed.

## A08 Software and Data Integrity Failures

- [x] CI gates before release.
- [x] Semantic release/tag process documented.

## A09 Security Logging and Monitoring Failures

- [x] App events and error tracking foundations.
- [ ] Live operational dashboard and alerts connected to response workflow.

## A10 Server-Side Request Forgery

- [ ] Not currently exposed in frontend-only architecture; review future server-side integrations.
