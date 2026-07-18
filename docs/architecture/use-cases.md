# Use Cases

## UC-01 Register account

- Actor: Visitor
- Goal: Create an account to access private routines.
- Main flow:
  1. User opens register page.
  2. User submits credentials.
  3. Auth provider creates user.
  4. User is redirected to protected app.
- Success criteria: account exists and user can access `/app`.

## UC-02 Login

- Actor: Registered user
- Goal: Resume routine tracking.
- Main flow:
  1. User submits identifier and password.
  2. Auth session is created.
  3. App loads user-scoped data.
- Success criteria: authenticated session and dashboard rendered.

## UC-03 Create routine with tasks

- Actor: Authenticated user
- Goal: Define a repeatable routine with initial tasks.
- Main flow:
  1. User opens routine wizard.
  2. User enters routine title and optional notes.
  3. User adds one or more tasks.
  4. App persists routine and tasks.
- Success criteria: routine appears in list with expected tasks.

## UC-04 Complete/uncomplete task

- Actor: Authenticated user
- Goal: Track progress accurately.
- Main flow:
  1. User toggles task checkbox.
  2. Task state updates.
  3. Completion event is recorded.
  4. Dashboard metrics reflect change.
- Success criteria: task status and event history are consistent.

## UC-05 Offline task creation and sync

- Actor: Authenticated user with unstable connection
- Goal: Avoid losing work while offline.
- Main flow:
  1. User adds task while offline.
  2. Task is queued locally.
  3. Connection is restored.
  4. Queue sync replaces local placeholders with remote records.
- Success criteria: queued tasks persisted remotely without duplication.

## UC-06 Reminder preparation

- Actor: Scheduled backend process
- Goal: Prepare due-task reminder events.
- Main flow:
  1. Edge function scans due tasks.
  2. User preferences are applied.
  3. Reminder events are written to app events.
- Success criteria: eligible due tasks generate reminder-ready events.
