# ADR-007: Quality gates and commit hygiene baseline

- Status: Accepted
- Date: 2026-07-18

## Context

High coverage alone does not prevent regressions if formatting, commit quality, and dependency updates are inconsistent.

## Decision

Adopt a layered quality baseline:

- CI gates: lint, test, build, E2E smoke.
- Local commit hygiene: Husky + lint-staged + Commitlint.
- Automated maintenance: Dependabot + CodeQL.

## Consequences

Positive:

- Fewer avoidable CI failures.
- Higher consistency in contribution quality.
- Better security posture by default.

Trade-offs:

- Slightly slower first-time setup.
- Contributors must follow stricter workflows.

## Alternatives considered

- CI-only enforcement: rejected, slower feedback loop.
- Manual dependency reviews only: rejected, low scalability.

## References

- [frontend/package.json](../../frontend/package.json)
- [.github/workflows/ci.yml](../../.github/workflows/ci.yml)
- [.github/workflows/codeql.yml](../../.github/workflows/codeql.yml)
- [.github/dependabot.yml](../../.github/dependabot.yml)
