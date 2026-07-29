import type { User } from '@supabase/supabase-js';
import { useMemo, useState } from 'react';
import { IS_DEMO_VARIANT } from '@/shared/config/appVariant';
import type { Routine } from '@/shared/types/routines';
import {
  clearDashboardDemoData,
  seedDashboardDemoData,
  seedFullDemoData,
} from '../data/seedDemoData';
import type { RoutineSchedule } from '@/shared/state/dashboardPrefsStore';

type RefreshAll = (params?: { since?: string; userId?: string | null }) => Promise<void>;

const DEMO_SCHEDULE_DAY_SETS: number[][] = [
  [1, 3, 5], // Mon/Wed/Fri
  [2, 4], // Tue/Thu
  [0, 6], // Sun/Sat
  [1, 4],
  [2, 5],
  [3],
];

// Demo-data seeding/clearing for the dashboard's "populate with sample data" tools.
// Kept out of DashboardPage so the page itself doesn't own this side-effecting logic.
export function useDashboardDemoSeeding(params: {
  user: User | null;
  refreshAll: RefreshAll;
  routineScheduleById: Record<string, RoutineSchedule>;
  setRoutineSchedule: (routineId: string, schedule: RoutineSchedule) => void;
  locationSearch: string;
  // Read at call time (a getter, not a snapshot value) so applyDemoScheduleDefaults sees routines
  // created moments earlier by the same seeding call, not a stale render's list. Passed in by the
  // caller (a page, which may depend on any feature) instead of importing routinesStore directly,
  // so this dashboard-feature hook doesn't reach into another feature's internals.
  getRoutines: () => Routine[];
}) {
  const { user, refreshAll, routineScheduleById, setRoutineSchedule, locationSearch, getRoutines } =
    params;

  const showSeedTools = useMemo(() => {
    // Demo seeding is ONLY allowed in the demo variant.
    if (!IS_DEMO_VARIANT) return false;
    if (import.meta.env.DEV) return true;
    const urlParams = new URLSearchParams(locationSearch);
    return urlParams.has('seed');
  }, [locationSearch]);

  const [seedBusy, setSeedBusy] = useState(false);
  const [seedError, setSeedError] = useState<string | null>(null);

  const seedSince = useMemo(
    () => new Date(Date.now() - 1000 * 60 * 60 * 24 * 120).toISOString(),
    [],
  );
  const seedSinceLong = useMemo(
    () => new Date(Date.now() - 1000 * 60 * 60 * 24 * 365).toISOString(),
    [],
  );

  const applyDemoScheduleDefaults = () => {
    const hasAnySchedule = Object.keys(routineScheduleById ?? {}).length > 0;
    if (hasAnySchedule) return;

    const all = getRoutines();
    if (!all || all.length === 0) return;

    // Prefer demo routines if present.
    const demo = all.filter((r) => r.title?.startsWith('Demo:'));
    const list = (demo.length ? demo : all).slice(0, 6);
    if (list.length === 0) return;

    // Simple, sensible defaults so “Hoy”/“Próximo” aren't empty.
    list.forEach((r, idx) => {
      setRoutineSchedule(r.id, {
        daysOfWeek: DEMO_SCHEDULE_DAY_SETS[idx % DEMO_SCHEDULE_DAY_SETS.length] ?? [1, 3, 5],
        hour: null,
      });
    });
  };

  const onSeedDemo = async () => {
    if (!user) return;
    const ok = window.confirm(
      'Esto creará rutinas/tareas DEMO y eventos de completitud en TU cuenta.\n\nPuedes eliminarlos con “Limpiar demo”. ¿Continuar?',
    );
    if (!ok) return;

    setSeedBusy(true);
    setSeedError(null);
    try {
      await seedDashboardDemoData(user.id);
      await refreshAll({ since: seedSince, userId: user.id });
      applyDemoScheduleDefaults();
    } catch (e) {
      setSeedError(e instanceof Error ? e.message : 'No se pudo poblar la demo');
    } finally {
      setSeedBusy(false);
    }
  };

  const onSeedFullDemo = async () => {
    if (!user) return;
    const ok = window.confirm(
      `Esto creará un set DEMO más completo (rutinas/tareas + historial de meses) en TU cuenta.

Incluye tareas con descripción/fecha/hora y muchos eventos para que el dashboard se vea “vivo”.

Puedes eliminarlo con “Limpiar demo”. ¿Continuar?`,
    );
    if (!ok) return;

    setSeedBusy(true);
    setSeedError(null);
    try {
      await seedFullDemoData(user.id, 'full');
      await refreshAll({ since: seedSinceLong, userId: user.id });
      applyDemoScheduleDefaults();
    } catch (e) {
      setSeedError(e instanceof Error ? e.message : 'No se pudo poblar la demo completa');
    } finally {
      setSeedBusy(false);
    }
  };

  const onClearDemo = async () => {
    if (!user) return;
    const ok = window.confirm(
      'Esto eliminará todas las rutinas “Demo:*” de TU cuenta. ¿Continuar?',
    );
    if (!ok) return;

    setSeedBusy(true);
    setSeedError(null);
    try {
      await clearDashboardDemoData(user.id);
      await refreshAll({ since: seedSince, userId: user.id });
    } catch (e) {
      setSeedError(e instanceof Error ? e.message : 'No se pudo limpiar la demo');
    } finally {
      setSeedBusy(false);
    }
  };

  return {
    showSeedTools,
    seedBusy,
    seedError,
    onSeedDemo,
    onSeedFullDemo,
    onClearDemo,
    applyDemoScheduleDefaults,
  };
}
