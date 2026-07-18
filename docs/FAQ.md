# FAQ

## Is NeuroRoutine production-ready?

NeuroRoutine is best described as a production-style MVP:

- product scope is still evolving,
- engineering quality practices are production-oriented.

## Why Supabase instead of a custom backend?

It provides secure auth, Postgres, and RLS with fast delivery velocity for MVP scope.

## Is user data isolated?

Yes. Data access is enforced by database-level RLS policies tied to authenticated user identity.

## Does it work offline?

It includes an offline queue foundation for task inserts and synchronization when connectivity returns.

## What test strategy is used?

- Unit/store tests via Vitest.
- UI behavior tests for key shared components.
- E2E coverage via Playwright.

## What is the roadmap focus?

- Security hardening in production headers.
- RLS regression verification.
- Search UI completion and improved offline conflict UX.
