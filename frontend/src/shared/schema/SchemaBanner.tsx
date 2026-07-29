import { useMemo } from 'react';
import { useSchemaStore } from './schemaStore';
import { useUiStore } from '@/shared/state/uiStore';

export function SchemaBanner() {
  const status = useSchemaStore((s) => s.status);
  const theme = useUiStore((s) => s.theme);
  const isDay = theme === 'day';

  const warnings = useMemo(() => {
    if (!status) return [];

    const next: string[] = [];
    if (
      !status.task_metadata.description ||
      !status.task_metadata.due_date ||
      !status.task_metadata.due_time
    ) {
      next.push('Faltan columnas opcionales en `routine_tasks` (descripción/fecha/hora).');
    }
    if (!status.task_metadata.is_recurring) {
      next.push('Falta la columna `is_recurring` y el RPC `reset_recurring_tasks` (0006).');
    }
    if (status.task_metadata.is_recurring && !status.task_metadata.recurrence_days_of_week) {
      next.push(
        'Falta la columna `recurrence_days_of_week` (0008): la recurrencia semanal no hace nada, solo la diaria.',
      );
    }
    if (!status.has_app_events) {
      next.push('Falta la tabla `app_events` (event log).');
    }
    if (!status.has_rate_limit_table) {
      next.push(
        'Falta la tabla `rpc_rate_limits` (0007): `get_email_by_username` no tiene límite de tasa activo.',
      );
    }

    return next;
  }, [status]);

  // This is a migration diagnostic for whoever operates the database, not product copy —
  // a real end user should never see instructions to run SQL. Surface it only in local dev;
  // in production it's still tracked (schemaStore logs/reports status), just not shown here.
  if (!warnings.length || !import.meta.env.DEV) return null;

  const boxClass = isDay
    ? 'rounded-lg bg-amber-50 px-4 py-3 text-amber-900 ring-1 ring-amber-200'
    : 'rounded-lg bg-amber-500/10 px-4 py-3 text-amber-100 ring-1 ring-amber-500/20';

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
  );
}
