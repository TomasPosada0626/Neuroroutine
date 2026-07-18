# Manual Actions Checklist (GitHub settings)

These actions cannot be fully enforced from repository code only.

## Branch protection for main

1. Settings -> Branches -> Add rule for `main`.
2. Require pull request before merging.
3. Require status checks to pass before merging.
4. Require conversation resolution before merging.
5. Disallow force pushes.
6. Disallow deletions.

## Required status checks

Set these as required:

- `Frontend (lint + test + build)`
- `Frontend E2E (Playwright)`
- `codeql / Analyze`
- `secret-scan / gitleaks`

## Milestones

Create milestones using [docs/github/milestones-plan.md](./milestones-plan.md):

- v1.0.1 - Security and quality hardening
- v1.1.0 - Reliability and experience
- v1.2.0 - Product differentiation

## Release tags

Create real tags only after changelog is ready:

```bash
git tag -a v1.0.1 -m "Release v1.0.1"
git push origin v1.0.1

git tag -a v1.1.0 -m "Release v1.1.0"
git push origin v1.1.0
```
