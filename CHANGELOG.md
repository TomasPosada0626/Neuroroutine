# Changelog

All notable changes to this project are documented here.

The format follows Keep a Changelog and Semantic Versioning principles.

## [Unreleased]

### Added

- ADR catalog and decision records in [docs/adr](docs/adr).
- Operational metrics baseline and service-level targets in [docs/operations/metrics.md](docs/operations/metrics.md).
- Security hardening guide with threat-oriented mitigations in [docs/security/hardening.md](docs/security/hardening.md).
- Release process documentation and automation workflow in [docs/releases/README.md](docs/releases/README.md) and [\.github/workflows/release.yml](.github/workflows/release.yml).
- Additional tests for routines services and offline queue.

### Changed

- Increased automated frontend coverage with additional branch-oriented tests.

## [1.0.0] - 2026-07-18

### Added

- Root project README rewritten for practicum/portfolio clarity.
- Supabase migration set aligned through reminder preferences schema.
- `send-due-reminders` edge function deployed and active.
- CI + deploy workflows for Vercel and Render.
- Unit and E2E test suites for core flows.

### Security

- RLS enforcement for user-scoped entities.
- DB-level ownership policies (`auth.uid()`).

[Unreleased]: https://github.com/TomasPosada0626/Neuroroutine/compare/v1.0.0...main
[1.0.0]: https://github.com/TomasPosada0626/Neuroroutine/releases/tag/v1.0.0
