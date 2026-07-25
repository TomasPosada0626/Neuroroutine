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

## Current `npm audit --audit-level=high` exceptions (2026-07-24)

- **`brace-expansion` (GHSA-mh99-v99m-4gvg)** and **`fast-uri` (GHSA-v2hh-gcrm-f6hx)**: fixed via
  `overrides` in `frontend/package.json`. `fast-uri` is a direct, safe minor bump (`^3.1.4`).
  `brace-expansion` needed care: overriding it directly to the patched major (`^5.0.8`) broke
  ESLint at runtime (`TypeError: expand is not a function`), because ESLint's own dependency,
  `minimatch@3.1.5`, was written against brace-expansion's older calling convention. The working
  fix instead overrides `minimatch` itself to `^10.2.5` (already used elsewhere in this tree by
  Stryker without issue) and lets it pull whatever brace-expansion version it was actually built
  against, rather than forcing a version mismatch between the two. Verified with `npm run lint`,
  `npm run test`, and `npm run build` after the change. Both are transitive dev-tooling
  dependencies (ESLint's config chain, ajv used by commitlint/Stryker) with zero runtime impact
  on the shipped app.
- **`react-router` / `react-router-dom` (GHSA-qwww-vcr4-c8h2, "RSC Mode CSRF Bypass")**: left
  unpatched on purpose. This app is a pure client-side SPA using only classic declarative-mode
  APIs (`BrowserRouter`, `Routes`, `Route`, `Navigate`, `Outlet`, `Link`, `useLocation`,
  `useNavigate`) — it never uses React Router's RSC/Server Actions framework mode, so the
  advisory doesn't apply to how this app actually uses the library. No non-vulnerable version is
  published yet (7.18.1 is latest and still in the flagged 7.12.0–8.2.0 range). Downgrading to
  7.11.0, as `npm audit fix --force` suggests, was tried and reverted: it lands inside a much
  larger vulnerable range (react-router 6.0.0–7.17.0) covering 14 advisories that *are* directly
  applicable — including XSS, open redirects, and arbitrary constructor invocation — so it's a
  strictly worse trade. Re-run `npm audit` after every react-router-dom bump and drop this
  exception once a version patches GHSA-qwww-vcr4-c8h2 without reopening the older range.
