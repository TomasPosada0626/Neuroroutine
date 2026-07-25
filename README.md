<div align="center">
  <h1>NeuroRoutine</h1>
  <p><strong>Smart daily routines manager | University Practicum Project</strong></p>
  <p><em>Full-stack SPA focused on secure architecture, practical UX, and production-ready engineering workflows.</em></p>
  <p><em>React 19, TypeScript, Vite, Tailwind CSS, Supabase (Auth + Postgres + RLS), Zustand, React Hook Form, Zod</em></p>
  <p><a href="https://neuroroutine.vercel.app/">Live Demo: neuroroutine.vercel.app</a></p>

  <p>
    <a href="https://github.com/TomasPosada0626/Neuroroutine/actions/workflows/ci.yml">
      <img alt="CI" src="https://github.com/TomasPosada0626/Neuroroutine/actions/workflows/ci.yml/badge.svg" />
    </a>
    <img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-10B981" />
  </p>

  <p>
    <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white" />
    <img alt="React" src="https://img.shields.io/badge/React-19.x-61DAFB?logo=react&logoColor=0B1320" />
    <img alt="Vite" src="https://img.shields.io/badge/Vite-7.x-646CFF?logo=vite&logoColor=white" />
    <img alt="TailwindCSS" src="https://img.shields.io/badge/TailwindCSS-3.x-06B6D4?logo=tailwindcss&logoColor=white" />
    <img alt="Supabase" src="https://img.shields.io/badge/Supabase-Auth%20%2B%20Postgres%20%2B%20RLS-3ECF8E?logo=supabase&logoColor=0B1320" />
    <img alt="React Router" src="https://img.shields.io/badge/React%20Router-7.x-CA4245?logo=reactrouter&logoColor=white" />
    <img alt="Zustand" src="https://img.shields.io/badge/Zustand-State%20Management-111827" />
    <img alt="React Hook Form" src="https://img.shields.io/badge/React%20Hook%20Form-Forms-EC5990" />
    <img alt="Zod" src="https://img.shields.io/badge/Zod-Validation-3E67B1" />
  </p>
</div>

---

## Table of Contents

- [Quick Start (60s)](#quick-start-60s)
- [What This Project Is](#what-this-project-is)
- [Core Features [CHANGED]](#core-features-changed)
- [Architecture Overview](#architecture-overview)
- [Key Design Decisions](#key-design-decisions)
- [Tech Stack [CHANGED]](#tech-stack-changed)
- [Project Structure](#project-structure)
- [Data Model](#data-model)
- [Security](#security)
- [Testing & Quality [CHANGED]](#testing--quality-changed)
- [Setup & Local Development](#setup--local-development)
- [Deployment](#deployment)
- [Roadmap (Future Advances) [CHANGED]](#roadmap-future-advances-changed)
- [Known Limitations (Intentional MVP Trade-offs) [NEW]](#known-limitations-intentional-mvp-trade-offs-new)
- [What I Learned Building This [NEW]](#what-i-learned-building-this-new)
- [For Instructors / Evaluators [NEW]](#for-instructors--evaluators-new)
- [Contributing](#contributing)
- [Author](#author)
- [License](#license)

---

## Quick Start (60s)

Requires Node.js 24.x (see `frontend/.nvmrc`; `nvm use` picks it up automatically). This is
pinned to what Vercel's build platform actually supports today, not just the newest Node release
— check `docs/engineering/dependency-policy.md` before bumping it again.

```bash
cd frontend
copy .env.example .env.local
npm install
npm run dev
```

Configure `frontend/.env.local`:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Then open `http://localhost:5173`.

---

## What This Project Is

NeuroRoutine is a full-stack university practicum MVP that demonstrates end-to-end product delivery with modern frontend architecture and secure backend design.

The project was built to prove practical capabilities in:

- Building a typed SPA with React + TypeScript.
- Integrating authentication and persistence with Supabase.
- Enforcing data isolation with Postgres Row-Level Security (RLS).
- Delivering with CI/CD and cloud deployment workflows.

Scope intent: this repository prioritizes engineering fundamentals done well over feature volume.

---

## Core Features [CHANGED]

### Authentication and Access

- Email/password sign-up and sign-in via Supabase Auth.
- Protected route access to `/app` for authenticated users.
- Session persistence and logout flow.

### Routines and Tasks

- CRUD operations for routines.
- Task creation, completion toggle, and deletion.
- Bulk task creation through the routine wizard.
- Event logging for completion/uncompletion actions.

### Dashboard and User Experience

- Activity and consistency-focused dashboard widgets.
- Theme and dashboard preference persistence.
- Responsive layout for desktop and mobile usage.

### Reliability and Product Foundations

- Routine search via Postgres RPC with full-text fallback, wired to a debounced search input
  in `RoutinePanel` (RPC result → Postgres full-text search → `ilike` fallback, in that order).
- Offline-first task queue with IndexedDB persistence (service worker planned for Phase 2).
- Reminder foundation (database schema + preferences ready; Edge Function deployment pending).

---

## Architecture Overview

High-level architecture by responsibility:

- `frontend/`: UI, route orchestration, feature modules, shared components/utilities.
- `backend/`: Supabase schema, SQL migrations, Edge Function source.
- Supabase: Auth + Postgres as managed backend platform.

```mermaid
flowchart LR
  U[User Browser] --> SPA[React SPA]
  SPA -->|supabase-js| SB[Supabase Platform]
  SB --> AUTH[Auth]
  SB --> DB[(Postgres)]
  DB --> RLS[RLS Policies]
  DB --> EVT[Events + Metrics Data]
```

Architecture references:

- `ARCHITECTURE.md`
- `backend/supabase/schema.sql`
- `backend/supabase/migrations/`

---

## Key Design Decisions

1. **Database-enforced authorization (RLS)**
   - Authorization rules are applied where data lives.
   - Prevents cross-user access even if frontend requests are manipulated.

2. **Feature-first frontend structure**
   - Improves maintainability by grouping domain logic (`auth`, `routines`, `dashboard`).
   - Reduces accidental coupling across modules.

3. **Zustand for lightweight state management**
   - Low-boilerplate store model fits MVP scope well.
   - Supports clean, testable action-based patterns.

4. **Event-oriented analytics model**
   - Completion events support reliable streak and consistency calculations.
   - Keeps metric logic auditable and extendable.

5. **Migration-driven backend evolution**
   - Schema changes are tracked and reproducible.
   - Supports safe iterative releases.

---

## Tech Stack [CHANGED]

### Frontend

- React 19
- TypeScript 5
- Vite 7
- Tailwind CSS 3
- React Router 7
- Zustand
- React Hook Form + Zod

### Backend

- Supabase Auth
- Supabase Postgres
- Row-Level Security (RLS)
- SQL migrations
- Edge Function scaffolding for reminders

### Quality and Delivery

- ESLint
- Vitest + Testing Library
- Playwright (smoke + optional authenticated flows)
- GitHub Actions CI
- Vercel and Render deployment pipelines

---

## Project Structure

```text
NeuroRoutine/
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   ├── pages/
│   │   ├── features/
│   │   │   ├── auth/
│   │   │   ├── routines/
│   │   │   └── dashboard/
│   │   └── shared/
│   ├── e2e/
│   ├── vite.config.ts
│   └── package.json
├── backend/
│   └── supabase/
│       ├── schema.sql
│       ├── migrations/
│       └── functions/
├── docs/
├── ARCHITECTURE.md
└── README.md
```

---

## Data Model

Main entities:

- `profiles`
- `routines`
- `routine_tasks`
- `routine_task_events`
- `app_events`
- `reminder_preferences`

Schema and migrations:

- `backend/supabase/schema.sql`
- `backend/supabase/migrations/`

The model supports both task lifecycle operations and analytics/event-based calculations.

---

## Security

Security design principles implemented in this project:

- RLS enabled on user-scoped data tables.
- Ownership checks bound to authenticated identity (`auth.uid()`).
- Public anon key constrained by database policies.
- Service role secrets never exposed in frontend runtime.

Practical result: user-level data boundaries are enforced by Postgres, not only by UI behavior.

---

## Testing & Quality [CHANGED]

Quality pipeline includes:

- `npm run lint`
- `npm run test`
- `npm run build`
- Playwright smoke checks

Coverage snapshot (`npm run test:coverage`, Node 24):

- **Statements:** 95.05%
- **Branches:** 81.51%
- **Functions:** 97.05%
- **Lines:** 97.19%

Mutation testing (`npm run test:mutation`, Stryker, scoped to `features/routines` + `shared/lib`):
**45.48%** mutation score. This is intentionally reported alongside line coverage rather than
instead of it: high statement coverage means the code *ran* during tests, mutation score measures
whether the assertions would actually *catch* a bug. The gap between 95% coverage and 45%
mutation score is the honest signal that some passing tests don't assert precisely enough yet —
tracked as a real backlog item, not smoothed over.

**Last updated:** 2026-07-25  
CI reference: https://github.com/TomasPosada0626/Neuroroutine/actions/workflows/ci.yml

---

## Setup & Local Development

```bash
cd frontend
npm install
npm run dev
```

Useful scripts:

```bash
npm run lint
npm run test
npm run build
npm run e2e
npm run e2e:ui
```

Recommended workflow:

1. Develop with `npm run dev`.
2. Validate quality gates locally (`lint`, `test`, `build`).
3. Push changes and rely on CI for verification.

---

## Deployment

Production deployment:

- Vercel (primary): https://neuroroutine.vercel.app
- Render (alternative)

Supabase backend operations:

```bash
cd backend
npx supabase migration list
npx supabase db push
npx supabase functions deploy send-due-reminders --project-ref <project-ref>
```

---

## Roadmap (Future Advances) 

### Phase 1

- Reminder Edge Function deployment and first scheduled execution.
- Expanded automated test depth for auth/routine critical paths.

### Phase 2

- Service worker + app-shell caching.
- Task reordering UX wired to existing drag-and-drop dependencies.
- Improved offline conflict messaging and recovery UX.

### Phase 3

- Real-time sync using Supabase Realtime subscriptions.
- Analytics export (CSV/PDF).
- Extended profile management and personalization.

---

## Known Limitations (Intentional MVP Trade-offs)

This MVP intentionally focuses on core engineering fundamentals. Current scope boundaries are explicit and planned:

| Feature | Status | Reason | Phase |
|---------|--------|--------|-------|
| **Service Worker** | Planned | IndexedDB queue already provides core offline resilience for MVP scope | Phase 2 |
| **Notifications** | Foundation ready | Schema + RLS are ready; Edge Function rollout is next step | Phase 1 |
| **Task Reordering** | Foundation ready | `@dnd-kit` installed; interaction wiring pending | Phase 2 |
| **User Profile Edit** | Basic profile only | Authentication and profile base exist; edit UX planned | Phase 2 |
| **Analytics Export** | Planned | CSV/PDF export not in MVP scope | Phase 3 |
| **Real-time Sync** | Planned | Current sync model is pull-based; realtime planned | Phase 3 |

### Coverage Gaps

- Current test coverage: 95.83% statements / 85.09% branches (target: keep statements/lines above 90% and branches above 85% as new features land).
- Priority expansion areas: remaining branch gaps in `routinesService.ts` and `routinesStore.ts` (see coverage report), and the RLS cross-user E2E job once re-enabled in CI.

---

## What I Learned Building This 

- **Database Security:** database-layer RLS is more robust than app-layer-only guards.
- **State Management:** Zustand provides excellent speed-to-value for MVP complexity.
- **Offline-first Design:** IndexedDB solves core persistence; service workers require lifecycle discipline.
- **Testing Strategy:** ~96% statement coverage enabled safe iteration; next milestone is wiring the already-written cross-user RLS E2E test into CI for deeper integration confidence.
- **Architecture Discipline:** clear module boundaries reduce feature creep and regression risk.
- **Deployment Maturity:** SPA routing and environment configuration are key production details.

---

## For Instructors / Evaluators 

### Quick Assessment (20 minutes)

**Setup and smoke test:**

```bash
cd frontend
npm install
npm run dev
# -> http://localhost:5173
```

Suggested validation flow:

1. Click "Get Started" -> "Sign Up".
2. Register with email/password.
3. Create a routine with 2-3 tasks.
4. Complete one task.
5. Refresh browser to confirm persisted data.
6. Run `npm run build` to verify production build integrity.

**Focused code review (10-15 minutes):**

- `ARCHITECTURE.md` - design decisions and dependency rules.
- `backend/supabase/schema.sql` - data model and RLS policies.
- `frontend/src/features/routines/routinesStore.ts` - state and orchestration pattern.
- `frontend/src/features/routines/__tests__/` - testing strategy in practice.

**Quality verification:**

```bash
npm run lint
npm run test
npm run build
```

---

## Contributing

Contributions are welcome.

Before opening a pull request:

```bash
npm run lint
npm run test
npm run build
```

Contribution checklist:

- No secrets committed.
- Relevant tests added or updated.
- Docs updated when behavior changes.

---

## Author

Tomas Posada  
GitHub: https://github.com/TomasPosada0626

---

## License

MIT License.
