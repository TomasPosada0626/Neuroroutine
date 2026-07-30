import { useState } from 'react';
import { Button, Input } from '@/shared/ui';
import type { RoutineSchedule } from '@/shared/state/dashboardPrefsStore';

type Props = {
  routineId: string;
  schedule: RoutineSchedule | undefined;
  onSetSchedule: (routineId: string, schedule: RoutineSchedule) => void;
  isDay: boolean;
  subtleText: string;
};

function scheduleSummary(sched: RoutineSchedule | undefined) {
  const days = sched?.daysOfWeek ?? [];
  const hour = sched?.hour ?? null;
  if (days.length === 0 && hour === null) return 'Sin programación';
  const labels = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
  const daysText = days.length
    ? days
        .slice()
        .sort((a, b) => a - b)
        .map((d) => labels[d] ?? String(d))
        .join(' ')
    : 'Sin días';
  const hourText = hour === null ? '' : ` · ${String(hour).padStart(2, '0')}:00`;
  return `${daysText}${hourText}`;
}

export function RoutineScheduleEditor({
  routineId,
  schedule,
  onSetSchedule,
  isDay,
  subtleText,
}: Props) {
  const [open, setOpen] = useState(false);

  const dayPillClass = (active: boolean) => {
    const base = 'rounded-lg px-2 py-1 text-xs font-medium ring-1 transition';
    if (isDay) {
      return (
        base +
        (active
          ? ' bg-slate-900 text-white ring-slate-900'
          : ' bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')
      );
    }
    return (
      base +
      (active
        ? ' bg-white/15 text-white ring-white/25'
        : ' bg-white/5 text-slate-200 ring-white/10 hover:bg-white/10')
    );
  };

  const days = schedule?.daysOfWeek ?? [];
  const hour = schedule?.hour ?? null;

  return (
    <div className="mt-2">
      <div className={'text-xs ' + subtleText}>Programación (para “Hoy/Próximo”)</div>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <div
          className={
            'rounded-lg px-2 py-1 text-xs ring-1 ' +
            (isDay
              ? 'bg-slate-50 text-slate-700 ring-slate-200'
              : 'bg-white/5 text-slate-200 ring-white/10')
          }
        >
          {scheduleSummary(schedule)}
        </div>
        <button
          type="button"
          className={'text-xs underline ' + (isDay ? 'text-slate-700' : 'text-slate-200')}
          onClick={() => setOpen((v) => !v)}
        >
          {/* Distinct from the "Editar" routine button elsewhere on screen: two controls with
              the same accessible name on one screen is a real a11y ambiguity, not just a
              testing inconvenience. */}
          {open ? 'Ocultar programación' : 'Editar programación'}
        </button>
      </div>

      {open ? (
        <div
          className={
            isDay
              ? 'mt-2 rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200'
              : 'mt-2 rounded-lg bg-white/5 p-3 ring-1 ring-white/10'
          }
        >
          <div className={'text-xs ' + subtleText}>Días</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {['D', 'L', 'M', 'X', 'J', 'V', 'S'].map((label, dow) => {
              const active = days.includes(dow);
              return (
                <button
                  key={dow}
                  type="button"
                  className={dayPillClass(active)}
                  onClick={() => {
                    const nextDays = active
                      ? days.filter((x) => x !== dow)
                      : [...days, dow].sort((a, b) => a - b);
                    onSetSchedule(routineId, { daysOfWeek: nextDays, hour });
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div className={'mt-3 text-xs ' + subtleText}>Hora (opcional)</div>
          <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              type="number"
              min={0}
              max={23}
              placeholder="0-23"
              value={hour ?? ''}
              onChange={(e) => {
                const raw = e.target.value.trim();
                const nextHour = raw === '' ? null : Math.max(0, Math.min(23, Number(raw)));
                onSetSchedule(routineId, { daysOfWeek: days, hour: nextHour });
              }}
            />
            <Button
              variant="secondary"
              onClick={() => onSetSchedule(routineId, { daysOfWeek: days, hour: null })}
            >
              Limpiar
            </Button>
          </div>
          <div className={'mt-2 text-xs ' + subtleText}>
            Solo organiza cómo ves esta rutina en Hoy/Próximo — no envía notificaciones. Para
            recordatorios por email, usa los ajustes de recordatorio en el panel de personalización.
          </div>
        </div>
      ) : null}
    </div>
  );
}
