# Diagramas

## Diagrama ER (Entity-Relationship)

Este proyecto mantiene el modelo de datos como SQL versionado en:

- `backend/supabase/schema.sql`

Para una vista visual (ideal para el README), agrega un diagrama ER en:

- `docs/diagrams/er-diagram.png`

### Opción A (recomendada): exportar desde Supabase Studio

1) Abre tu proyecto en Supabase.
2) Ve a la sección **Database**.
3) Busca la vista **ER Diagram** / **Schema Visualizer** (el nombre puede variar según la versión de Studio).
4) Ajusta el zoom para que se vean `profiles`, `routines` y `routine_tasks`.
5) Exporta a imagen si la UI lo permite; si no, toma una captura en alta resolución.
6) Guarda el archivo como `docs/diagrams/er-diagram.png`.

### Opción B: captura desde una herramienta externa (si prefieres)

- Genera el diagrama con la herramienta que uses (por ejemplo, dbdiagram.io) y exporta como PNG.
- Mantén los nombres de tablas/campos alineados con `backend/supabase/schema.sql`.

Sugerencia: mantén el diagrama simple (3 tablas + relaciones) para que sea legible en GitHub.
