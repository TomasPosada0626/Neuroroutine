import { useMemo } from 'react'
import { useSchemaStore } from './schemaStore'
import { useUiStore } from '@/shared/state/uiStore'

export function SchemaBanner() {
  const status = useSchemaStore((s) => s.status)
  const theme = useUiStore((s) => s.theme)
  const isDay = theme === 'day'

  const warnings = useMemo(() => {
    if (!status) return []

    const next: string[] = []
    if (!status.task_metadata.description || !status.task_metadata.due_date || !status.task_metadata.due_time) {
      next.push('Faltan columnas opcionales en `routine_tasks` (descripción/fecha/hora).')
    }
    if (!status.has_app_events) {
      next.push('Falta la tabla `app_events` (event log).')
    }

    return next
  }, [status])

  if (!warnings.length) return null

  const boxClass = isDay
    ? 'rounded-lg bg-amber-50 px-4 py-3 text-amber-900 ring-1 ring-amber-200'
    : 'rounded-lg bg-amber-500/10 px-4 py-3 text-amber-100 ring-1 ring-amber-500/20'

  return (
    <div className={boxClass} role="status" aria-label="Aviso de migraciones">
      <div className="text-sm font-semibold">Base de datos: migraciones pendientes</div>
      <ul className="mt-1 list-disc pl-5 text-sm">
        {warnings.map((w) => (
          <li key={w}>{w}</li>
        ))}
      </ul>
      <div className="mt-2 text-xs opacity-90">
        Aplica los SQL en `backend/supabase/migrations/` o usa `backend/supabase/schema.sql`.
      </div>
    </div>
  )
}
