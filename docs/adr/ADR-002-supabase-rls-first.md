# ADR-002: Supabase platform with RLS-first authorization

- Status: Accepted
- Date: 2026-07-18

## Context

The product needs authenticated multi-user data access with strict isolation, fast delivery, and low backend operations overhead.

## Decision

Use Supabase Auth + Postgres with Row-Level Security as the authorization boundary.

- Frontend uses only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- Per-user data access is enforced at database policy level through `auth.uid()` checks.
- Incremental backend evolution is migration-driven.

## Consequences

Positive:

- Security model enforced where data lives.
- Reduced custom backend boilerplate for MVP.
- Faster delivery with robust defaults.

Trade-offs:

- Requires strong migration hygiene.
- Team must understand RLS semantics and policy testing.

## Alternatives considered

- Custom Node API + ORM from day one: rejected for MVP speed and operational complexity.
- Frontend-only auth checks: rejected due to weak trust boundary.

## References

- [backend/supabase/schema.sql](../../backend/supabase/schema.sql)
- [backend/supabase/migrations](../../backend/supabase/migrations)
- [backend/README.md](../../backend/README.md)
