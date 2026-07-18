# Clean Architecture and SOLID Mapping

This document clarifies how current code aligns with Clean Architecture and SOLID principles.

## Layered intent

1. Presentation
   - Route/pages and UI components.
2. Application
   - Feature stores orchestrating use-case actions.
3. Infrastructure
   - Supabase client/services and persistence adapters.

## SOLID mapping

### Single Responsibility

- Services focus on data access.
- Stores focus on orchestration and state transitions.
- UI components focus on rendering and interaction.

### Open/Closed

- Feature modules are extendable without central rewrites.
- New behaviors can be added via feature-level services/stores.

### Liskov Substitution

- Domain types and DTO shapes are consistently used across services/stores.

### Interface Segregation

- Consumer modules import only the feature APIs they use.

### Dependency Inversion

- High-level UI depends on feature contracts, not direct DB access.
- Shared API client abstracts transport details.

## Practical boundaries

- `shared` must not depend on `features`.
- `features` may depend on `shared`, not peer feature internals.
- `pages` compose flows and avoid business rule ownership.

## Current limitations

- Some orchestration and infrastructure concerns still coexist inside stores for MVP speed.
- Future refactor path: extract explicit use-case functions between UI and store layers.
