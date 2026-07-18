# Backlog (GitHub Projects + Issues)

Este documento define exactamente que crear en tu GitHub backlog para mostrar madurez de producto, priorizacion tecnica y ejecucion profesional.

## 1. Estructura del backlog en GitHub

Usa GitHub Projects (board) con estas columnas:

1. `Ideas`
2. `Ready`
3. `In Progress`
4. `Blocked`
5. `In Review`
6. `Done`

Regla:

- Ninguna tarea entra a `In Progress` sin criterios de aceptacion.
- Ninguna tarea entra a `Done` sin evidencia (PR, tests, screenshot, o deploy).

## 2. Labels obligatorios

Crea estos labels para organizar y filtrar:

### Tipo de trabajo

- `type:feature`
- `type:bug`
- `type:chore`
- `type:refactor`
- `type:docs`
- `type:test`
- `type:security`
- `type:devops`

### Prioridad

- `priority:P0` (critico)
- `priority:P1` (alto)
- `priority:P2` (medio)
- `priority:P3` (bajo)

### Esfuerzo (estimacion)

- `size:XS` (<= 2h)
- `size:S` (medio dia)
- `size:M` (1-2 dias)
- `size:L` (3-5 dias)

### Area

- `area:frontend`
- `area:backend`
- `area:database`
- `area:testing`
- `area:security`
- `area:observability`
- `area:docs`
- `area:ci-cd`

### Estado de riesgo

- `risk:low`
- `risk:medium`
- `risk:high`

## 3. Campos recomendados en GitHub Projects

Agrega estos campos personalizados:

1. `Priority` (single select: P0/P1/P2/P3)
2. `Size` (single select: XS/S/M/L)
3. `Area` (single select)
4. `Sprint` (text, por ejemplo `2026-W30`)
5. `Target Release` (text, por ejemplo `v1.1.0`)
6. `Owner` (assignee)
7. `Blocked By` (text o linked issue)

## 4. Definition of Ready (DoR)

Una issue esta `Ready` solo si cumple:

- Problema claramente descrito.
- Valor esperado definido.
- Criterios de aceptacion listados.
- Riesgos conocidos anotados.
- Dependencias identificadas.

## 5. Definition of Done (DoD)

Una issue esta `Done` solo si cumple:

- PR mergeado a `main`.
- Tests relevantes agregados/actualizados y en verde.
- Lint/build en verde.
- Documentacion actualizada si cambio comportamiento.
- Si aplica: captura de pantalla o evidencia de deploy.

## 6. Plantilla de issue (usar siempre)

Crea issues con esta estructura:

```md
## Contexto

Que problema existe hoy y por que importa.

## Objetivo

Resultado esperado en una frase.

## Alcance

- Incluye:
- Excluye:

## Criterios de aceptacion

- [ ] Criterio 1 verificable
- [ ] Criterio 2 verificable
- [ ] Criterio 3 verificable

## Riesgos

- Riesgo tecnico:
- Riesgo funcional:

## Dependencias

- Issue/PR relacionada:

## Evidencia esperada

- Test, screenshot, log, o enlace de deploy.
```

## 7. Backlog inicial recomendado (para NeuroRoutine)

## Epic A: Product polish y UX

### A1. Integrar SearchBar con busqueda RPC existente

- Labels: `type:feature`, `priority:P1`, `area:frontend`, `size:M`
- Criterios:
  - [ ] SearchBar visible en panel de rutinas.
  - [ ] Debounce funcional sin flicker.
  - [ ] Estado vacio y error de busqueda cubiertos.
  - [ ] Tests de interaccion basicos.

### A2. Reordering de tareas con @dnd-kit

- Labels: `type:feature`, `priority:P1`, `area:frontend`, `size:L`
- Criterios:
  - [ ] Drag and drop funcional por rutina.
  - [ ] Orden persistido.
  - [ ] Teclado soportado para accesibilidad minima.

### A3. Mejoras de accesibilidad en auth y dashboard

- Labels: `type:feature`, `priority:P1`, `area:frontend`, `size:M`
- Criterios:
  - [ ] Roles/labels accesibles revisados.
  - [ ] Contraste minimo WCAG AA en componentes clave.
  - [ ] Navegacion por teclado validada en flujos principales.

## Epic B: Reliability y offline

### B1. Service worker app-shell (fase 2)

- Labels: `type:feature`, `priority:P2`, `area:frontend`, `size:L`
- Criterios:
  - [ ] Cache de assets criticos.
  - [ ] Estrategia de actualizacion controlada.
  - [ ] Documentacion de invalidacion cache.

### B2. Mensajeria de conflictos offline->online

- Labels: `type:feature`, `priority:P1`, `area:frontend`, `size:M`
- Criterios:
  - [ ] UI informa conflictos de sincronizacion.
  - [ ] Usuario puede reintentar sync manual.
  - [ ] Eventos de error relevantes registrados.

### B3. E2E de sincronizacion offline

- Labels: `type:test`, `priority:P1`, `area:testing`, `size:M`
- Criterios:
  - [ ] Escenario offline crea tareas locales.
  - [ ] Escenario reconexion sincroniza y reemplaza ids locales.

## Epic C: Observability y metricas

### C1. Dashboard de metricas operativas

- Labels: `type:feature`, `priority:P2`, `area:observability`, `size:M`
- Criterios:
  - [ ] Consultas base para CI success, deploy success, error rate.
  - [ ] Vista simple semanal para seguimiento.

### C2. Instrumentar duracion de flujos clave

- Labels: `type:feature`, `priority:P2`, `area:observability`, `size:S`
- Criterios:
  - [ ] Capturar `duration_ms` en login y create routine.
  - [ ] Sin incluir PII en metadata.

## Epic D: Seguridad y hardening

### D1. Configurar CSP y headers de seguridad en hosting

- Labels: `type:security`, `priority:P1`, `area:security`, `size:M`
- Criterios:
  - [ ] CSP aplicada sin romper app.
  - [ ] Referrer-Policy y Permissions-Policy definidas.
  - [ ] Evidencia en entorno real.

### D2. Prueba de regresion RLS multiusuario

- Labels: `type:test`, `priority:P1`, `area:database`, `size:M`
- Criterios:
  - [ ] Caso A no puede ver datos B.
  - [ ] Caso B no puede mutar datos A.
  - [ ] Test automatizado o script reproducible.

## Epic E: DevEx y release quality

### E1. Plantillas de PR e issues

- Labels: `type:docs`, `priority:P2`, `area:docs`, `size:S`
- Criterios:
  - [ ] PR template con checklist de calidad.
  - [ ] Issue templates para bug/feature.

### E2. Branch protection para main

- Labels: `type:devops`, `priority:P1`, `area:ci-cd`, `size:S`
- Criterios:
  - [ ] Require status checks en CI.
  - [ ] Require pull request antes de merge.

### E3. Pipeline de release tags semver

- Labels: `type:devops`, `priority:P2`, `area:ci-cd`, `size:S`
- Criterios:
  - [ ] Release workflow validado con tag de prueba.
  - [ ] Notas de release generadas correctamente.

## 8. Orden sugerido de ejecucion (prioridad real)

1. D1 (CSP/headers)
2. D2 (RLS regression)
3. A1 (SearchBar)
4. B2 (conflict UX)
5. E2 (branch protection)
6. C2 (flow duration events)
7. A2 (task reordering)
8. B3 (offline sync E2E)
9. B1 (service worker)
10. C1 (metrics dashboard)

## 9. Regla para priorizar nuevas tareas

Puntua cada issue de 1 a 5 en:

- `Impacto usuario`
- `Riesgo si no se hace`
- `Alineacion portfolio`
- `Esfuerzo inverso` (5 = muy facil)

Score total = suma de 4 factores.

Ordena de mayor a menor score y ajusta por dependencias.

## 10. Checklist de backlog saludable (semanal)

- [ ] Al menos 5 issues en `Ready`.
- [ ] Ninguna issue sin prioridad y size.
- [ ] Ninguna issue en `In Progress` por mas de 7 dias sin update.
- [ ] Cada issue cerrada tiene evidencia.
- [ ] Se movieron items de `Unreleased` en changelog cuando hubo release.
