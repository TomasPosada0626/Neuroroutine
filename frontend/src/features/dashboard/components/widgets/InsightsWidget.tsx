import { useState } from 'react';
import { WidgetCardShell } from '@/features/dashboard/components/WidgetCardShell';
import {
  computeSelectedRoutineAnalytics,
  computeStruggleTasks,
} from '@/features/dashboard/utils/dashboardAnalytics';
import { computeWeekCounts, formatHour } from '@/features/dashboard/utils/dashboardUtils';
import { Button } from '@/shared/ui';
import type { DashboardWidgetId } from '@/shared/state/dashboardPrefsStore';

type Props = {
  userId: string | null;
  weekCounts: ReturnType<typeof computeWeekCounts>;
  selectedRoutineAnalytics: ReturnType<typeof computeSelectedRoutineAnalytics>;
  struggleTasks: ReturnType<typeof computeStruggleTasks>;
  isDay: boolean;
  subtleText: string;
  panelText: string;
  collapsed: boolean;
  onToggleCollapsed: (id: DashboardWidgetId) => void;
  // Owned by the page, not this widget: ARCHITECTURE.md only sanctions features/auth as a
  // cross-feature import, so scheduling a reminder (features/reminders) is injected as a callback
  // instead of this widget importing that feature's service directly.
  onScheduleReminderAtHour: (hour: number) => Promise<void>;
};

export function InsightsWidget({
  userId,
  weekCounts,
  selectedRoutineAnalytics,
  struggleTasks,
  isDay,
  subtleText,
  panelText,
  collapsed,
  onToggleCollapsed,
  onScheduleReminderAtHour,
}: Props) {
  const [reminderSaving, setReminderSaving] = useState(false);
  const [reminderSaved, setReminderSaved] = useState(false);
  const [reminderSaveError, setReminderSaveError] = useState(false);

  return (
    <WidgetCardShell
      id="insights"
      title="Insights accionables"
      subtitle="Qué hacer ahora + dónde mejorar."
      collapsed={collapsed}
      onToggleCollapsed={onToggleCollapsed}
      subtleText={subtleText}
    >
      <div className="space-y-3">
        <div
          className={
            'rounded-lg p-3 ring-1 ' +
            (isDay ? 'bg-slate-50 ring-slate-200' : 'bg-white/5 ring-white/10')
          }
        >
          <div className={'text-xs ' + subtleText}>Comparativa semanal</div>
          <div className={'mt-1 text-sm font-medium ' + panelText}>
            {weekCounts.thisWeekCompleted} completadas esta semana • {weekCounts.prevWeekCompleted}{' '}
            la anterior
          </div>
        </div>

        <div
          className={
            'rounded-lg p-3 ring-1 ' +
            (isDay ? 'bg-slate-50 ring-slate-200' : 'bg-white/5 ring-white/10')
          }
        >
          <div className={'text-xs ' + subtleText}>Mejor ventana horaria</div>
          <div className={'mt-1 text-sm font-medium ' + panelText}>
            {selectedRoutineAnalytics.source === 'events'
              ? `${formatHour(selectedRoutineAnalytics.bestWindowStart)}–${formatHour((selectedRoutineAnalytics.bestWindowStart + 2) % 24)}`
              : 'Activa historial real para calcularlo.'}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              disabled={selectedRoutineAnalytics.source !== 'events' || reminderSaving}
              onClick={async () => {
                if (selectedRoutineAnalytics.source !== 'events' || !userId) return;
                setReminderSaveError(false);
                setReminderSaving(true);
                try {
                  await onScheduleReminderAtHour(selectedRoutineAnalytics.bestWindowStart);
                  setReminderSaved(true);
                  window.setTimeout(() => setReminderSaved(false), 1500);
                } catch {
                  setReminderSaveError(true);
                } finally {
                  setReminderSaving(false);
                }
              }}
            >
              Programar recordatorio en mi mejor hora
            </Button>
            {reminderSaved ? (
              <div className={'text-xs ' + (isDay ? 'text-emerald-600' : 'text-emerald-300')}>
                Guardado
              </div>
            ) : null}
            {reminderSaveError ? (
              <div className="text-xs text-rose-600">No se pudo guardar. Intenta de nuevo.</div>
            ) : null}
          </div>
        </div>

        <div
          className={
            'rounded-lg p-3 ring-1 ' +
            (isDay ? 'bg-slate-50 ring-slate-200' : 'bg-white/5 ring-white/10')
          }
        >
          <div className={'text-xs ' + subtleText}>Qué te está frenando</div>
          {struggleTasks.length === 0 ? (
            <div className={'mt-1 text-sm ' + panelText}>
              Aún no hay suficientes señales. Completa/uncompleta tareas para generar insights.
            </div>
          ) : (
            <div className="mt-2 space-y-2">
              {struggleTasks.map((t) => (
                <div key={t.taskId}>
                  <div className={'text-sm font-medium ' + panelText}>{t.title}</div>
                  <div className={'text-xs ' + subtleText}>{t.hint}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </WidgetCardShell>
  );
}
