# Changelog

All notable changes to this project are documented here.

The format follows Keep a Changelog and Semantic Versioning principles.

## [Unreleased]

### Added

- Daily-recurring tasks (`is_recurring`): a habit's checkbox now means "done today" and resets
  automatically once a new local day starts, instead of staying checked forever after the
  first completion. See [ADR-008](docs/adr/ADR-008-recurring-tasks-daily-reset.md).
- Offline-sync conflict UX: a queued task that fails to sync for a real (non-network) reason
  now shows why and offers a "Descartar" action, instead of retrying silently forever.
- Sentry performance tracing, sampled instead of fully disabled.
- Accessibility test coverage (axe + keyboard) for the shared UI kit.
- ADR catalog and decision records in [docs/adr](docs/adr).
- Operational metrics baseline and service-level targets in [docs/operations/metrics.md](docs/operations/metrics.md).
- Security hardening guide with threat-oriented mitigations in [docs/security/hardening.md](docs/security/hardening.md).
- Release process documentation and automation workflow in [docs/releases/README.md](docs/releases/README.md) and [\.github/workflows/release.yml](.github/workflows/release.yml).
- Additional tests for routines services and offline queue.

### Fixed

- Creating a routine from the dashboard's wizard could leave the analytics selector and the
  routine panel out of sync with each other until a manual refresh (two independent caches of
  the same routine list).

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
