# Contributing

Thanks for your interest in contributing to NeuroRoutine.

## Development setup

```bash
cd frontend
npm install
copy .env.example .env.local
npm run dev
```

## Quality gates

Before opening a pull request, run:

```bash
npm run lint
npm run test
npm run build
```

## Branch strategy

- Create a feature branch from `main`.
- Keep changes focused and reviewable.
- Reference related issues in commits/PR descriptions.

## Pull request checklist

- [ ] Scope is clearly described.
- [ ] Relevant tests added/updated.
- [ ] Lint/build pass locally.
- [ ] Docs updated if behavior changed.
- [ ] No secrets or credentials included.

## Commit style

Conventional commit messages are recommended (and enforced when hooks are installed):

- `feat: add routine search bar`
- `fix: handle offline sync error state`
- `docs: update deployment guide`
