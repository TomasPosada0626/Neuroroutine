# Dependency Policy

## Goal

Keep dependencies secure, maintainable, and predictable.

## Update policy

1. Weekly automated updates via Dependabot.
2. Patch/minor updates are preferred; major updates require explicit review and test evidence.
3. Security updates are prioritized over feature updates.

## Risk tiers

- High risk: auth, routing, networking, build tooling, runtime libs.
- Medium risk: test tooling and non-critical UX libs.
- Low risk: formatting/tooling with isolated impact.

## Approval requirements

- Lint/test/build green.
- Changelog note for meaningful dependency shifts.
- Rollback path identified for high-risk updates.

## Vulnerability handling SLA

- Critical/high: action within 24-72h.
- Moderate: action within 7 days.
- Low: action in normal maintenance cadence.

## Lockfile discipline

- Do not edit lockfiles manually.
- Keep lockfile updates bundled with related dependency changes.
