import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/features/auth/authStore'
import { RoutineFormModal } from '@/features/routines/components'
import { RoutinePanel } from '@/features/routines/components/RoutinePanel'
import { useRoutines } from '@/features/routines/routinesStore'
import { AppShell } from '@/shared/layout'
import { cn } from '@/shared/lib/cn'
import { useUiStore } from '@/shared/state/uiStore'
import { Button, Card } from '@/shared/ui'

type RangeKey = '7d' | '28d' | '90d'

function formatPct(value: number) {
  return `${Math.max(0, Math.min(100, Math.round(value)))}%`
}

function dateKeyLocal(d: Date) {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export function DashboardPage() {
  const { user } = useAuth()
  const theme = useUiStore((s) => s.theme)
  const isDay = theme === 'day'
  const subtleText = isDay ? 'text-slate-600' : 'text-slate-300'
  const panelText = isDay ? 'text-slate-700' : 'text-slate-200'

  const {
    loading,
    error,
    routines,
    selectedRoutineId,
    allTasks,
    loadRoutines,
    loadAllTasks,
    addRoutine,
    setTaskDone,
  } = useRoutines()

  const [range, setRange] = useState<RangeKey>('28d')
  const [createOpen, setCreateOpen] = useState(false)

  useEffect(() => {
    void loadRoutines()
    void loadAllTasks()
  }, [loadRoutines, loadAllTasks])

  const name =
    (user?.user_metadata?.first_name as string | undefined) ||
    (user?.user_metadata?.username as string | undefined) ||
    'tu'

  const routineTitleById = useMemo(() => {
    const map = new Map<string, string>()
    for (const r of routines) map.set(r.id, r.title)
    return map
  }, [routines])

  const tasksTotal = allTasks.length
  const tasksDone = useMemo(() => allTasks.filter((t) => t.is_done).length, [allTasks])
  const completionRate = tasksTotal ? (tasksDone / tasksTotal) * 100 : 0

  const todayFocus = useMemo(() => {
    const pending = allTasks
      .filter((t) => !t.is_done)
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    return pending.slice(0, 7)
  }, [allTasks])

  const heatmap = useMemo(() => {
    const windowDays = range === '7d' ? 7 : range === '28d' ? 28 : 90
    const end = new Date()
    end.setHours(0, 0, 0, 0)

    const days: Date[] = []
    for (let i = windowDays - 1; i >= 0; i--) {
      const d = new Date(end)
      d.setDate(end.getDate() - i)
      days.push(d)
    }

    const doneCounts = new Map<string, number>()
    for (const task of allTasks) {
      if (!task.is_done) continue
      const d = new Date(task.updated_at)
      const key = dateKeyLocal(d)
      doneCounts.set(key, (doneCounts.get(key) ?? 0) + 1)
    }

    const counts = days.map((d) => ({ key: dateKeyLocal(d), date: d, count: doneCounts.get(dateKeyLocal(d)) ?? 0 }))
    const max = counts.reduce((m, x) => Math.max(m, x.count), 0)

    // Streak estimate: consecutive days with count > 0.
    let streak = 0
    for (let i = counts.length - 1; i >= 0; i--) {
      if (counts[i].count > 0) streak++
      else break
    }

    let best = 0
    let run = 0
    for (const c of counts) {
      if (c.count > 0) {
        run++
        best = Math.max(best, run)
      } else {
        run = 0
      }
    }

    return { counts, max, streak, best }
  }, [allTasks, range])

  const lastActivity = useMemo(() => {
    if (allTasks.length === 0) return null
    const newest = allTasks.reduce((best, t) => (new Date(t.updated_at) > new Date(best.updated_at) ? t : best), allTasks[0])
    return new Date(newest.updated_at)
  }, [allTasks])

  const rangeButtonClass = (active: boolean) =>
    cn(
      'rounded-full px-3 py-1 text-xs ring-1 transition',
      active
        ? isDay
          ? 'bg-slate-900 text-white ring-slate-900'
          : 'bg-white/15 text-white ring-white/25'
        : isDay
          ? 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50'
          : 'bg-white/5 text-slate-200 ring-white/10 hover:bg-white/10',
    )

  const kpiValueClass = isDay ? 'text-slate-900' : 'text-white'
  const kpiLabelClass = isDay ? 'text-slate-600' : 'text-slate-300'

  const heatCellClass = (count: number) => {
    if (count === 0) return isDay ? 'bg-slate-200/70' : 'bg-white/7'
    const t = heatmap.max ? count / heatmap.max : 0
    if (t < 0.34) return isDay ? 'bg-cyan-200' : 'bg-cyan-500/30'
    if (t < 0.67) return isDay ? 'bg-cyan-400' : 'bg-cyan-400/45'
    return isDay ? 'bg-cyan-600' : 'bg-cyan-300/70'
  }

  return (
    <AppShell>
      <RoutineFormModal
        open={createOpen}
        title="Nueva rutina"
        confirmLabel="Crear"
        loading={loading}
        initialValues={{ title: '', notes: '' }}
        onClose={() => setCreateOpen(false)}
        onConfirm={async (values) => {
          if (!user) throw new Error('Debes iniciar sesión')
          await addRoutine({
            user_id: user.id,
            title: values.title,
            notes: values.notes?.trim() ? values.notes.trim() : null,
          })
          setCreateOpen(false)
        }}
      />

      <div className="mb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-2xl font-semibold">Mi progreso</div>
            <div className={'text-sm ' + subtleText}>Hola, {name}. Rutinas y tareas, sin fricción.</div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className={rangeButtonClass(range === '7d')} onClick={() => setRange('7d')}>
              7 días
            </button>
            <button type="button" className={rangeButtonClass(range === '28d')} onClick={() => setRange('28d')}>
              28 días
            </button>
            <button type="button" className={rangeButtonClass(range === '90d')} onClick={() => setRange('90d')}>
              90 días
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <Card className="mb-6">
          <div className="text-sm text-rose-600">{error}</div>
        </Card>
      ) : null}

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Card>
          <div className={'text-xs ' + kpiLabelClass}>Rutinas activas</div>
          <div className={'mt-1 text-2xl font-semibold ' + kpiValueClass}>{routines.length}</div>
          <div className={'mt-1 text-xs ' + subtleText}>Organiza por hábito o objetivo</div>
        </Card>
        <Card>
          <div className={'text-xs ' + kpiLabelClass}>Tareas totales</div>
          <div className={'mt-1 text-2xl font-semibold ' + kpiValueClass}>{tasksTotal}</div>
          <div className={'mt-1 text-xs ' + subtleText}>En todas tus rutinas</div>
        </Card>
        <Card>
          <div className={'text-xs ' + kpiLabelClass}>Completadas</div>
          <div className={'mt-1 text-2xl font-semibold ' + kpiValueClass}>{tasksDone}</div>
          <div className={'mt-1 text-xs ' + subtleText}>Basado en tus checks</div>
        </Card>
        <Card>
          <div className={'text-xs ' + kpiLabelClass}>Tasa de cumplimiento</div>
          <div className={'mt-1 text-2xl font-semibold ' + kpiValueClass}>{formatPct(completionRate)}</div>
          <div className={'mt-2 h-2 w-full rounded-full ' + (isDay ? 'bg-slate-200' : 'bg-white/10')}>
            <div
              className={'h-2 rounded-full bg-gradient-to-r from-cyan-400 to-violet-500'}
              style={{ width: `${Math.min(100, Math.max(0, completionRate))}%` }}
            />
          </div>
        </Card>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold">Hoy</div>
              <div className={'text-xs ' + subtleText}>Tu foco inmediato (pendientes recientes)</div>
            </div>
            <Button variant="secondary" onClick={() => setCreateOpen(true)}>
              Nueva rutina
            </Button>
          </div>

          {todayFocus.length === 0 ? (
            <div className={'mt-4 rounded-lg p-3 ring-1 ' + (isDay ? 'bg-slate-50 text-slate-700 ring-slate-200' : 'bg-white/5 text-slate-200 ring-white/10')}>
              No hay tareas pendientes. Crea una rutina o añade tareas para ver tu “Hoy” aquí.
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {todayFocus.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={
                    'flex w-full items-center justify-between gap-3 rounded-lg p-3 text-left ring-1 transition ' +
                    (isDay ? 'bg-white ring-slate-200 hover:bg-slate-50' : 'bg-white/5 ring-white/10 hover:bg-white/7')
                  }
                  onClick={() => void setTaskDone({ id: t.id, routine_id: t.routine_id, is_done: !t.is_done })}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={t.is_done}
                      readOnly
                      className={isDay ? '' : 'accent-cyan-300'}
                    />
                    <div>
                      <div className={'text-sm font-medium ' + panelText}>{t.title}</div>
                      <div className={'text-xs ' + subtleText}>
                        {routineTitleById.get(t.routine_id) ?? 'Rutina'}
                        {selectedRoutineId === t.routine_id ? ' • seleccionada' : ''}
                      </div>
                    </div>
                  </div>
                  <div className={'text-xs ' + subtleText}>Tocar para marcar</div>
                </button>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <div>
            <div className="text-sm font-semibold">Insights</div>
            <div className={'text-xs ' + subtleText}>Lecturas rápidas (estimadas)</div>
          </div>

          <div className="mt-4 grid gap-3">
            <div className={cn('rounded-lg p-3 ring-1', isDay ? 'bg-slate-50 ring-slate-200' : 'bg-white/5 ring-white/10')}>
              <div className={'text-xs ' + subtleText}>Racha</div>
              <div className={'mt-1 text-lg font-semibold ' + kpiValueClass}>
                {heatmap.streak} días
                <span className={'ml-2 text-xs font-normal ' + subtleText}>(mejor: {heatmap.best})</span>
              </div>
            </div>

            <div className={cn('rounded-lg p-3 ring-1', isDay ? 'bg-slate-50 ring-slate-200' : 'bg-white/5 ring-white/10')}>
              <div className={'text-xs ' + subtleText}>Última actividad</div>
              <div className={'mt-1 text-sm font-medium ' + panelText}>
                {lastActivity ? lastActivity.toLocaleString() : '—'}
              </div>
            </div>

            <div className={cn('rounded-lg p-3 ring-1', isDay ? 'bg-slate-50 ring-slate-200' : 'bg-white/5 ring-white/10')}>
              <div className={'text-xs ' + subtleText}>Privacidad</div>
              <div className={'mt-1 text-sm font-medium ' + panelText}>Solo tú ves tus datos (RLS)</div>
            </div>
          </div>
        </Card>
      </div>

      <div className="mb-8">
        <Card>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold">Actividad</div>
              <div className={'text-xs ' + subtleText}>Checks por día (según el último cambio de la tarea)</div>
            </div>
            <div className={'text-xs ' + subtleText}>Rango: {range}</div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <div className="inline-grid grid-flow-col grid-rows-7 gap-1">
              {heatmap.counts.map((c) => (
                <div
                  key={c.key}
                  title={`${c.key}: ${c.count}`}
                  className={
                    'h-3 w-3 rounded-sm ring-1 ' +
                    heatCellClass(c.count) +
                    ' ' +
                    (isDay ? 'ring-slate-200' : 'ring-white/10')
                  }
                />
              ))}
            </div>
          </div>

          <div className={'mt-3 flex items-center justify-between text-xs ' + subtleText}>
            <div>Menos</div>
            <div className="flex items-center gap-1">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={
                    'h-3 w-3 rounded-sm ring-1 ' +
                    (i === 0
                      ? heatCellClass(0)
                      : heatCellClass(Math.max(1, Math.round((heatmap.max * i) / 3)))) +
                    ' ' +
                    (isDay ? 'ring-slate-200' : 'ring-white/10')
                  }
                />
              ))}
            </div>
            <div>Más</div>
          </div>
        </Card>
      </div>

      {routines.length === 0 ? (
        <Card className="mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-base font-semibold">Empieza en 2 minutos</div>
              <div className={'mt-1 text-sm ' + subtleText}>Crea tu primera rutina y añade 3 tareas.</div>
              <ol className={'mt-3 list-decimal pl-5 text-sm ' + panelText}>
                <li>Crea una rutina (ej. Mañana, Gym, Estudio)</li>
                <li>Añade 3 tareas pequeñas</li>
                <li>Marca una como completada</li>
              </ol>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => setCreateOpen(true)}>Crear rutina</Button>
              <Button variant="secondary" onClick={() => void loadRoutines()}>
                Refrescar
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      <RoutinePanel onCreateRoutine={() => setCreateOpen(true)} />
    </AppShell>
  )
}
