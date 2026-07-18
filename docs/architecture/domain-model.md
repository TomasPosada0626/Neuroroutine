# Domain Model

## Core Entities

1. Profile
   - Represents user identity metadata.
   - Linked to auth user id.

2. Routine
   - A recurring user-owned plan.
   - Contains a title, notes, timestamps.

3. Routine Task
   - Atomic action belonging to a routine.
   - Supports status, optional description, due date/time.

4. Routine Task Event
   - Immutable completion/uncompletion event.
   - Used for streak and consistency analytics.

5. App Event
   - Product-level operational event (privacy-sanitized).
   - Supports observability and behavior analysis.

6. Reminder Preference
   - User preference for reminder behavior.
   - Controls scheduling eligibility.

## Aggregates

- Routine aggregate:
  - Root: Routine
  - Children: RoutineTask
  - Event stream: RoutineTaskEvent

## Invariants

1. User ownership
   - User can only access own records (enforced by RLS).

2. Task belongs to routine
   - Every task references one routine.

3. Event validity
   - Event type must be `completed` or `uncompleted`.

4. Reminder hour range
   - Hour is constrained to 0..23.

## Domain Events (logical)

- RoutineCreated
- RoutineDeleted
- TaskCreated
- TaskCompleted
- TaskUncompleted
- TaskDeleted
- ReminderDuePrepared

## Bounded Contexts (pragmatic)

1. Identity & Access
2. Routine Management
3. Progress Analytics
4. Reminder Scheduling
5. Operational Observability
