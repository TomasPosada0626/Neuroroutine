# Event Contracts

This document defines versioned contracts for `app_events` consumers.

## Versioning

- Contract version: `v1`
- Compatibility policy: additive fields only in minor updates.

## Common envelope

- `event_name`: string (required)
- `user_id`: uuid (required)
- `routine_id`: uuid | null
- `routine_task_id`: uuid | null
- `meta`: object (sanitized, non-PII)
- `created_at`: timestamp

## Event catalog (v1)

1. `auth_login_success`
   - meta:
     - `flow`: string (`login_password` expected)
     - `duration_ms`: number

2. `routine_created`
   - meta:
     - `duration_ms`: number

3. `routine_deleted`
   - meta: optional

4. `task_created`
   - meta:
     - `duration_ms`: number

5. `tasks_created_bulk`
   - meta:
     - `count`: number
     - `duration_ms`: number

6. `task_completed`
   - meta:
     - `duration_ms`: number

7. `task_uncompleted`
   - meta:
     - `duration_ms`: number

8. `task_deleted`
   - meta: optional

9. `offline_sync_completed`
   - meta:
     - `synced_count`: number
     - `duration_ms`: number

10. `reminder_due_task`
   - Producer: edge function `send-due-reminders`
   - meta:
     - `due_date`: string | null
     - `task_title`: string
     - `routine_title`: string | null

## Privacy guardrails

- No email, username, first name, last name, password, or task descriptions in meta.
- Keep payload small and operational.
