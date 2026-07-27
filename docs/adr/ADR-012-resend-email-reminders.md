# ADR-012: Real email reminders via Resend from the existing Edge Function

- Status: Accepted
- Date: 2026-07-27

## Context

ADR-010 shipped a client-only browser notification as an explicit, honest stop-gap, stating
plainly that no email/push provider was wired up yet and that the fallback "requires no server,
no provider account". `send-due-reminders` already existed and already computed the right due-task
set per user, but only wrote `app_events` rows — no actual email was ever sent. This ADR closes
that gap now that a Resend account/API key is available, without touching the client-side fallback
(both stay active; the fallback still covers the day someone opens the dashboard before an email
would arrive).

## Decision

Extend `send-due-reminders` (no new function) to send one summary email per user per run via
Resend's HTTP API, gated entirely behind an optional `RESEND_API_KEY` secret:

- If the secret is absent, behavior is unchanged from before this ADR (events only, no email,
  function still succeeds). This matters for anyone running this project without a Resend
  account — the reminder pipeline doesn't hard-fail just because email isn't configured.
- If present, all of a user's due tasks for the day are batched into a single email (not one email
  per task) using their `profiles.email` and `profiles.first_name`.
- `reminder_preferences.email_enabled` still gates who gets emailed, same as it already gated the
  `app_events` write; a user with no row in that table defaults to enabled (matches the column's
  own `DEFAULT true`, so unmigrated/never-configured users aren't silently skipped).
- The sender defaults to Resend's shared `onboarding@resend.dev` test address (works immediately,
  but Resend restricts it to delivering only to the account owner's own verified email) and is
  overridable via `RESEND_FROM_EMAIL` once a real sending domain is verified in Resend.
- A failed send for one user (bad address, Resend outage, rate limit) is collected into the
  response body's `emailErrors` and does not stop the rest of the batch from sending.

Scheduling is unchanged from what `backend/supabase/functions/README.md` already documented
(daily Supabase Dashboard schedule) — this ADR is about the send path, not when it runs.

## Consequences

Positive:

- Users now get an actual delivered reminder, not just an in-app event row, closing the exact gap
  ADR-010 named.
- Zero blast radius for deployments without a Resend key: the function's existing behavior and
  response shape are additive (`emailsSent`, `emailProviderConfigured`, `emailErrors` are new
  fields; nothing existing was removed or renamed).

Trade-offs:

- The default `onboarding@resend.dev` sender only reaches the Resend account owner's own address
  until a domain is verified — real multi-user delivery requires that verification step, which is
  an account-level action outside this codebase (documented in the functions README, not silently
  assumed done).
- No retry/backoff on a failed send within a run; a failure is reported, not retried, until the
  next scheduled run picks the task up again (it's still due, still unread).
- No unsubscribe/bounce handling. Acceptable for v1 given `reminder_preferences.email_enabled` is
  already a user-controlled opt-out inside the app; a bounce-handling webhook is a reasonable
  follow-up if delivery issues are observed in practice.

## Alternatives considered

- A separate `send-reminder-emails` function calling `send-due-reminders` internally or duplicating
  its due-task query: rejected — would double the due-task query logic and the two functions could
  drift out of sync on what counts as "due".
- Postmark instead of Resend: not chosen only because the available credential was for Resend;
  the integration is provider-specific (a single `fetch` call to Resend's API) but small enough
  that swapping providers later is a contained change, not a design constraint worth generalizing
  ahead of time.
- Queueing emails through a dedicated table + separate dispatcher function: rejected as
  over-engineered for the current volume (one function invocation per day, one email per user with
  due tasks) — direct send-inline keeps the operational surface at one function, matching ADR-010's
  stated preference for minimal new infrastructure.

## References

- [backend/supabase/functions/send-due-reminders/index.ts](../../backend/supabase/functions/send-due-reminders/index.ts)
- [backend/supabase/functions/README.md](../../backend/supabase/functions/README.md)
- [ADR-010](./ADR-010-client-only-fallback-notifications.md)
