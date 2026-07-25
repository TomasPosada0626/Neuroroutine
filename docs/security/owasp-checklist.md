# OWASP-Aligned Checklist

This checklist tracks practical controls aligned with common OWASP risks.

## A01 Broken Access Control

- [x] RLS per-user ownership in Postgres.
- [x] Protected routes in frontend.
- [ ] Add automated multi-user mutation regression tests in CI.

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
- [ ] Enable strict branch protections in GitHub settings.

## A06 Vulnerable and Outdated Components

- [x] Dependabot and npm audit workflow in use.
- [x] CodeQL enabled.

## A07 Identification and Authentication Failures

- [x] Supabase Auth-based flows.
- [x] New-account password minimum raised to 10 characters; username-login lookup performs a
      timing-equalized dummy auth call to reduce user-enumeration via response time.
- [ ] Review redirect URLs/session settings and bot resistance.
- [ ] Add server-side rate limiting on `get_email_by_username` (currently only client-side timing
      mitigation; request-volume limiting still needs an Edge Function proxy or Supabase-level control).

## A08 Software and Data Integrity Failures

- [x] CI gates before release.
- [x] Semantic release/tag process documented.

## A09 Security Logging and Monitoring Failures

- [x] App events and error tracking foundations.
- [ ] Live operational dashboard and alerts connected to response workflow.

## A10 Server-Side Request Forgery

- [ ] Not currently exposed in frontend-only architecture; review future server-side integrations.
