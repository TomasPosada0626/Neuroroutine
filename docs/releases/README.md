# Release Process (SemVer + Tags + Notes)

This project uses Semantic Versioning and Git tags for releases.

## Versioning Rules

- `MAJOR`: breaking changes
- `MINOR`: backward-compatible feature additions
- `PATCH`: backward-compatible fixes

Examples:

- `v1.0.0` initial stable release
- `v1.1.0` new feature set
- `v1.1.1` bugfix

## Release Flow

1. Update [CHANGELOG.md](../../CHANGELOG.md):
   - Move relevant items from `Unreleased` to the new version block.
2. Create and push tag:

```bash
git tag -a v1.1.0 -m "Release v1.1.0"
git push origin v1.1.0
```

3. GitHub Actions release workflow publishes release notes for that tag.

## Automated Workflow

- Workflow file: [\.github/workflows/release.yml](../../.github/workflows/release.yml)
- Triggered on:
  - push of tags matching `v*.*.*`
  - manual dispatch with `tag` input

## Release Notes Guidance

Each release note should include:

- Summary of user-visible changes
- Technical highlights (architecture/security/testing)
- Any migration or environment actions needed
- Known issues

## Pre-release Checklist

- CI passing on main
- Lint/test/build green locally
- Deployment vars present
- Changelog updated
- Tag follows semver format
