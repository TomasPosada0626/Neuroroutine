# Security Policy

## Supported scope

This repository is an educational/portfolio project with production-style engineering practices.

## Reporting a vulnerability

Please report security issues privately to project maintainers instead of opening public issues.

Include:

- Affected component/file.
- Reproduction steps.
- Impact assessment.
- Suggested mitigation (if available).

## Secrets handling

- Never commit credentials or tokens.
- Use environment variables and provider secret stores.
- Rotate leaked credentials immediately.

## Security baseline

- Supabase Auth and Postgres RLS for user data boundaries.
- Frontend uses publishable keys only.
- Service-role credentials are server-side only.

## Hardening roadmap

See [docs/security/hardening.md](docs/security/hardening.md) for threat model and hardening checklist.
