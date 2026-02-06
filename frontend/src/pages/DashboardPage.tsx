import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '@/features/auth/authStore'
import { useDashboardPrefs, type DashboardWidgetId, type RoutineSchedule } from '@/features/dashboard/dashboardPrefsStore'
import { computeDayActivitySet, computeStreaks, computeWeekCounts, formatTimeAgo } from '@/features/dashboard/dashboardUtils'
import { clearDashboardDemoData, seedDashboardDemoData, seedFullDemoData } from '@/features/dashboard/seedDemoData'
import { WidgetOrderEditor } from '@/features/dashboard/WidgetOrderEditor'
import { RoutineWizardModal } from '@/features/routines/components/RoutineWizardModal'
import { RoutinePanel } from '@/features/routines/components/RoutinePanel'
import { useRoutines, useRoutinesStore } from '@/features/routines/routinesStore'
import { AppShell } from '@/shared/layout'
import { cn } from '@/shared/lib/cn'
import { useUiStore } from '@/shared/state/uiStore'
import { Button, Card, Input, Modal, Tooltip } from '@/shared/ui'

type RangeKey = '7d' | '28d' | '90d'
type BucketGranularity = 'day' | 'week'

function formatPct(value: number) {
  return `${Math.max(0, Math.min(100, Math.round(value)))}%`
}

function dateKeyLocal(d: Date) {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function windowDaysFromRange(range: RangeKey) {
  return range === '7d' ? 7 : range === '28d' ? 28 : 90
}

function startOfDayLocal(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function startOfWeekMondayLocal(d: Date) {
  const x = startOfDayLocal(d)
  const day = x.getDay() // 0..6 (Sun..Sat)
  const diff = (day + 6) % 7 // Mon=0
  x.setDate(x.getDate() - diff)
  return x
}

function startOfWeekLocal(d: Date, weekStartsOn: 0 | 1) {
  if (weekStartsOn === 1) return startOfWeekMondayLocal(d)
  const x = startOfDayLocal(d)
  x.setDate(x.getDate() - x.getDay())
  return x
}

function endOfWeekLocal(d: Date, weekStartsOn: 0 | 1) {
  const start = startOfWeekLocal(d, weekStartsOn)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(0, 0, 0, 0)
  return end
}

function addDaysLocal(d: Date, days: number) {
  const x = new Date(d)
  x.setDate(x.getDate() + days)
  return x
}

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v))
}

function formatHour(h: number) {
  return `${String(h).padStart(2, '0')}:00`
}

type PopoverTip = {
  x: number
  y: number
  title: string
  lines: string[]
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

function usePopoverTooltip() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [tip, setTip] = useState<PopoverTip | null>(null)

  useEffect(() => {
    if (!tip) return
    const onPointerDown = (e: PointerEvent) => {
      const el = containerRef.current
      if (!el) return
      if (el.contains(e.target as Node)) return
      setTip(null)
    }
    window.addEventListener('pointerdown', onPointerDown, { capture: true })
    return () => window.removeEventListener('pointerdown', onPointerDown, { capture: true } as AddEventListenerOptions)
  }, [tip])

  const show = (
    e: Pick<React.MouseEvent, 'clientX' | 'clientY'> | Pick<React.PointerEvent, 'clientX' | 'clientY'>,
    next: Omit<PopoverTip, 'x' | 'y'>,
  ) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const rawX = e.clientX - rect.left
    const rawY = e.clientY - rect.top
    const x = clamp(rawX, 64, rect.width - 64)
    const y = clamp(rawY, 36, rect.height - 12)
    setTip({ x, y, ...next })
  }

  const hide = () => setTip(null)

  return { containerRef, tip, show, hide }
}

export function DashboardPage() {
  const location = useLocation()
  const { user } = useAuth()
  const theme = useUiStore((s) => s.theme)
  const isDay = theme === 'day'
  const subtleText = isDay ? 'text-slate-600' : 'text-slate-300'
  const panelText = isDay ? 'text-slate-700' : 'text-slate-200'

  const prefs = useDashboardPrefs()

  const {
    loading,
    error,
    offline,
    lastSyncedAt,
    routines,
    selectedRoutineId,
    tasksByRoutineId,
    allTasks,
    taskEvents,
    hydrateFromCache,
    refreshAll,
    loadTasks,
    selectRoutine,
    setTaskDone,
  } = useRoutines()

  const [range, setRange] = useState<RangeKey>('28d')
  const [createOpen, setCreateOpen] = useState(false)
  const [customizeOpen, setCustomizeOpen] = useState(false)
  const [reminderSaved, setReminderSaved] = useState(false)
  const [scheduleRoutineId, setScheduleRoutineId] = useState<string | null>(null)

  const didAutoPickRoutineRef = useRef(false)
  const didManualPickRoutineRef = useRef(false)

  const applyDemoScheduleDefaults = () => {
    const hasAnySchedule = Object.keys(prefs.routineScheduleById ?? {}).length > 0
    if (hasAnySchedule) return

    const all = useRoutinesStore.getState().routines
    if (!all || all.length === 0) return

    // Prefer demo routines if present.
    const demo = all.filter((r) => r.title?.startsWith('Demo:'))
    const list = (demo.length ? demo : all).slice(0, 6)
    if (list.length === 0) return

    // Simple, sensible defaults so “Hoy”/“Próximo” aren't empty.
    const daySets: number[][] = [
      [1, 3, 5], // Mon/Wed/Fri
      [2, 4], // Tue/Thu
      [0, 6], // Sun/Sat
      [1, 4],
      [2, 5],
      [3],
    ]
    list.forEach((r, idx) => {
      prefs.setRoutineSchedule(r.id, { daysOfWeek: daySets[idx % daySets.length] ?? [1, 3, 5], hour: null })
    })
  }

  useEffect(() => {
    // For a better first impression (and demo), default to a routine so analytics aren't empty.
    if (didAutoPickRoutineRef.current) return
    if (didManualPickRoutineRef.current) return
    if (selectedRoutineId) return
    if (routines.length === 0) return
    didAutoPickRoutineRef.current = true
    selectRoutine(routines[0].id)
  }, [selectedRoutineId, routines, selectRoutine])

  const showSeedTools = useMemo(() => {
    if (import.meta.env.DEV) return true
    const params = new URLSearchParams(location.search)
    return params.has('seed')
  }, [location.search])

  const [seedBusy, setSeedBusy] = useState(false)
  const [seedError, setSeedError] = useState<string | null>(null)

  const routinePanelRef = useRef<HTMLDivElement | null>(null)
  const [routineGranularity, setRoutineGranularity] = useState<BucketGranularity>(() => (range === '90d' ? 'week' : 'day'))
  const effectiveRoutineGranularity: BucketGranularity = range === '90d' ? 'week' : routineGranularity

  useEffect(() => {
    if (scheduleRoutineId) return
    if (selectedRoutineId) {
      setScheduleRoutineId(selectedRoutineId)
      return
    }
    if (routines.length > 0) setScheduleRoutineId(routines[0].id)
  }, [scheduleRoutineId, selectedRoutineId, routines])

  useEffect(() => {
    hydrateFromCache()
    void refreshAll({ since: new Date(Date.now() - 1000 * 60 * 60 * 24 * 120).toISOString() })
  }, [hydrateFromCache, refreshAll])

  const seedSince = useMemo(() => new Date(Date.now() - 1000 * 60 * 60 * 24 * 120).toISOString(), [])
  const seedSinceLong = useMemo(() => new Date(Date.now() - 1000 * 60 * 60 * 24 * 365).toISOString(), [])

  const onSeedDemo = async () => {
    if (!user) return
    const ok = window.confirm(
      'Esto creará rutinas/tareas DEMO y eventos de completitud en TU cuenta.\n\nPuedes eliminarlos con “Limpiar demo”. ¿Continuar?',
    )
    if (!ok) return

    setSeedBusy(true)
    setSeedError(null)
    try {
      await seedDashboardDemoData(user.id)
      await refreshAll({ since: seedSince })
      applyDemoScheduleDefaults()
    } catch (e) {
      setSeedError(e instanceof Error ? e.message : 'No se pudo poblar la demo')
    } finally {
      setSeedBusy(false)
    }
  }

  const onSeedFullDemo = async () => {
    if (!user) return
    const ok = window.confirm(
      `Esto creará un set DEMO más completo (rutinas/tareas + historial de meses) en TU cuenta.

Incluye tareas con descripción/fecha/hora y muchos eventos para que el dashboard se vea “vivo”.

Puedes eliminarlo con “Limpiar demo”. ¿Continuar?`,
    )
    if (!ok) return

    setSeedBusy(true)
    setSeedError(null)
    try {
      await seedFullDemoData(user.id, 'full')
      await refreshAll({ since: seedSinceLong })
      applyDemoScheduleDefaults()
    } catch (e) {
      setSeedError(e instanceof Error ? e.message : 'No se pudo poblar la demo completa')
    } finally {
      setSeedBusy(false)
    }
  }

  const onClearDemo = async () => {
    if (!user) return
    const ok = window.confirm('Esto eliminará todas las rutinas “Demo:*” de TU cuenta. ¿Continuar?')
    if (!ok) return

    setSeedBusy(true)
    setSeedError(null)
    try {
      await clearDashboardDemoData(user.id)
      await refreshAll({ since: seedSince })
    } catch (e) {
      setSeedError(e instanceof Error ? e.message : 'No se pudo limpiar la demo')
    } finally {
      setSeedBusy(false)
    }
  }

  // Map the top-level scope to the analytics range for a coherent experience.
  useEffect(() => {
    if (prefs.scope === 'month' && range !== '28d') setRange('28d')
    if (prefs.scope === 'week' && range !== '7d') setRange('7d')
    if (prefs.scope === 'today' && range !== '7d') setRange('7d')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefs.scope])

  useEffect(() => {
    if (selectedRoutineId) void loadTasks(selectedRoutineId)
  }, [selectedRoutineId, loadTasks])

  const onStartSession = (routineId?: string | null) => {
    const id = routineId ?? selectedRoutineId ?? (routines[0]?.id ?? null)
    if (id) selectRoutine(id)
    routinePanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const onCreatedRoutine = (routineId: string) => {
    selectRoutine(routineId)
    routinePanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const name = useMemo(() => {
    const meta = (user?.user_metadata ?? {}) as Record<string, unknown>
    const raw =
      (typeof meta.first_name === 'string' ? meta.first_name : undefined) ||
      (typeof meta.full_name === 'string' ? meta.full_name : undefined) ||
      (typeof meta.name === 'string' ? meta.name : undefined) ||
      (typeof meta.username === 'string' ? meta.username : undefined)

    const email = user?.email
    const fromEmail = email ? email.split('@')[0] : ''

    const base = (raw || fromEmail || '').trim()
    if (!base) return ''

    const token = base.split(/[._\-\s]+/).filter(Boolean)[0] ?? base
    return token ? token.charAt(0).toUpperCase() + token.slice(1) : ''
  }, [user])

  const routineTitleById = useMemo(() => {
    const map = new Map<string, string>()
    for (const r of routines) map.set(r.id, r.title)
    return map
  }, [routines])

  const taskTitleById = useMemo(() => {
    const map = new Map<string, string>()
    for (const t of allTasks) map.set(t.id, t.title)
    return map
  }, [allTasks])

  const tasksTotal = allTasks.length
  const tasksDone = useMemo(() => allTasks.filter((t) => t.is_done).length, [allTasks])
  const completionRate = tasksTotal ? (tasksDone / tasksTotal) * 100 : 0

  const activitySet = useMemo(() => computeDayActivitySet(taskEvents, { routineId: selectedRoutineId }), [taskEvents, selectedRoutineId])
  const streaks = useMemo(() => computeStreaks(activitySet), [activitySet])
  const weekCounts = useMemo(
    () => computeWeekCounts(taskEvents, { weekStartsOn: prefs.weekStartsOn, routineId: selectedRoutineId }),
    [taskEvents, prefs.weekStartsOn, selectedRoutineId],
  )

  const weeklyProgressPct = prefs.weeklyGoal ? Math.min(100, (weekCounts.thisWeekCompleted / prefs.weeklyGoal) * 100) : 0

  const achievements: { id: string; title: string; desc: string; earned: boolean }[] = [
    { id: 'streak3', title: '3 días seguidos', desc: 'Mantén el impulso inicial.', earned: streaks.best >= 3 },
    { id: 'streak7', title: 'Semana completa', desc: '7 días con actividad.', earned: streaks.best >= 7 },
    {
      id: 'goal',
      title: 'Meta semanal',
      desc: `Completa ${prefs.weeklyGoal} tareas esta semana.`,
      earned: weekCounts.thisWeekCompleted >= prefs.weeklyGoal,
    },
  ]

  const riskText =
    streaks.current <= 0
      ? 'Empieza hoy con una tarea pequeña.'
      : !streaks.hasToday
        ? 'Riesgo: hoy aún vas en 0. Completa 1 tarea para mantener la racha.'
        : 'Vas bien: ya sumaste actividad hoy.'

  const next7Days = useMemo(() => {
    const now = new Date()
    const days: { key: string; date: Date; label: string }[] = []
    const weekdayShort = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
    for (let i = 0; i < 7; i++) {
      const d = new Date(now)
      d.setDate(now.getDate() + i)
      const k = dateKeyLocal(d)
      const label = i === 0 ? 'Hoy' : `${weekdayShort[d.getDay()]} ${d.getDate()}`
      days.push({ key: k, date: d, label })
    }
    return days
  }, [])

  const scheduledRoutinesByDow = useMemo(() => {
    const byDow = new Map<number, string[]>()
    for (const r of routines) {
      const sched = prefs.routineScheduleById[r.id]
      if (!sched || !Array.isArray(sched.daysOfWeek) || sched.daysOfWeek.length === 0) continue
      for (const dow of sched.daysOfWeek) {
        const list = byDow.get(dow) ?? []
        list.push(r.id)
        byDow.set(dow, list)
      }
    }
    return byDow
  }, [routines, prefs.routineScheduleById])

  const todayDow = new Date().getDay()
  const scheduledToday = useMemo(() => {
    const ids = scheduledRoutinesByDow.get(todayDow) ?? []
    return ids.map((id) => routines.find((r) => r.id === id)).filter(Boolean)
  }, [scheduledRoutinesByDow, todayDow, routines])

  const selectedRoutine = useMemo(
    () => routines.find((r) => r.id === selectedRoutineId) ?? null,
    [routines, selectedRoutineId],
  )

  const selectedRoutineTasks = useMemo(() => {
    if (!selectedRoutineId) return allTasks
    return tasksByRoutineId[selectedRoutineId] ?? []
  }, [selectedRoutineId, tasksByRoutineId, allTasks])

  const hasEvents = Array.isArray(taskEvents) && taskEvents.length > 0

  const selectedRoutineAnalytics = useMemo(() => {
    const windowDays = windowDaysFromRange(range)
    const end = startOfDayLocal(new Date())
    const start = new Date(end)
    start.setDate(end.getDate() - (windowDays - 1))

    const events = hasEvents
      ? taskEvents
          .filter((ev) => (selectedRoutineId ? ev.routine_id === selectedRoutineId : true))
          .filter((ev) => {
            const t = new Date(ev.created_at).getTime()
            return t >= start.getTime() && t < end.getTime() + 1000 * 60 * 60 * 24
          })
          .slice()
      : []

    // daily buckets (local days)
    const days: Date[] = []
    for (let i = windowDays - 1; i >= 0; i--) {
      const d = new Date(end)
      d.setDate(end.getDate() - i)
      days.push(d)
    }

    const byDay = new Map<string, { completed: number; uncompleted: number }>()
    const byWeek = new Map<string, { completed: number; uncompleted: number; weekStart: Date }>()

    const hourCompleted = new Array<number>(24).fill(0)
    const hourUncompleted = new Array<number>(24).fill(0)

    const weekdayCompleted = new Array<number>(7).fill(0) // 0=Sun..6=Sat

    const perTaskEvents = new Map<string, { created_at: string; event_type: 'completed' | 'uncompleted' }[]>()
    const taskCounts = new Map<
      string,
      { completed: number; uncompleted: number; reopens: number }
    >()

    if (events.length > 0) {
      // Sort ascending for interval/reopen analysis.
      events.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      for (const ev of events) {
        const t = new Date(ev.created_at)
        const dayKey = dateKeyLocal(t)
        const current = byDay.get(dayKey) ?? { completed: 0, uncompleted: 0 }
        if (ev.event_type === 'completed') current.completed += 1
        else current.uncompleted += 1
        byDay.set(dayKey, current)

        const weekStart = startOfWeekMondayLocal(t)
        const weekKey = dateKeyLocal(weekStart)
        const w = byWeek.get(weekKey) ?? { completed: 0, uncompleted: 0, weekStart }
        if (ev.event_type === 'completed') w.completed += 1
        else w.uncompleted += 1
        byWeek.set(weekKey, w)

        const h = t.getHours()
        if (ev.event_type === 'completed') hourCompleted[h] += 1
        else hourUncompleted[h] += 1

        if (ev.event_type === 'completed') weekdayCompleted[t.getDay()] += 1

        const list = perTaskEvents.get(ev.routine_task_id) ?? []
        list.push({ created_at: ev.created_at, event_type: ev.event_type })
        perTaskEvents.set(ev.routine_task_id, list)

        const c = taskCounts.get(ev.routine_task_id) ?? { completed: 0, uncompleted: 0, reopens: 0 }
        if (ev.event_type === 'completed') c.completed += 1
        else c.uncompleted += 1
        taskCounts.set(ev.routine_task_id, c)
      }

      // Reopens: completed -> uncompleted transitions per task
      for (const [taskId, list] of perTaskEvents.entries()) {
        const c = taskCounts.get(taskId)
        if (!c) continue
        let prev: 'completed' | 'uncompleted' | null = null
        for (const ev of list) {
          if (prev === 'completed' && ev.event_type === 'uncompleted') c.reopens += 1
          prev = ev.event_type
        }
        taskCounts.set(taskId, c)
      }
    }

    const daySeries = days.map((d) => {
      const key = dateKeyLocal(d)
      const val = byDay.get(key) ?? { completed: 0, uncompleted: 0 }
      return { key, date: d, ...val }
    })

    const weekSeries = Array.from(byWeek.values())
      .sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime())
      .map((w) => ({ key: dateKeyLocal(w.weekStart), weekStart: w.weekStart, completed: w.completed, uncompleted: w.uncompleted }))

    const totalCompleted = daySeries.reduce((s, x) => s + x.completed, 0)
    const totalUncompleted = daySeries.reduce((s, x) => s + x.uncompleted, 0)
    const activeDays = daySeries.filter((d) => d.completed > 0).length
    const activeDaysPct = windowDays ? (activeDays / windowDays) * 100 : 0

    // streak & best within range
    let streak = 0
    for (let i = daySeries.length - 1; i >= 0; i--) {
      if (daySeries[i].completed > 0) streak++
      else break
    }
    let best = 0
    let run = 0
    for (const d of daySeries) {
      if (d.completed > 0) {
        run++
        best = Math.max(best, run)
      } else {
        run = 0
      }
    }

    // Hour best window (3-hour)
    let bestWindowStart = 0
    let bestWindowSum = -1
    for (let s = 0; s < 24; s++) {
      const sum = hourCompleted[s] + hourCompleted[(s + 1) % 24] + hourCompleted[(s + 2) % 24]
      if (sum > bestWindowSum) {
        bestWindowSum = sum
        bestWindowStart = s
      }
    }

    // intervals between completed events (overall, not per task)
    const completedTimes: number[] = []
    for (const ev of events) {
      if (ev.event_type !== 'completed') continue
      completedTimes.push(new Date(ev.created_at).getTime())
    }
    completedTimes.sort((a, b) => a - b)
    const intervalsHours: number[] = []
    for (let i = 1; i < completedTimes.length; i++) {
      intervalsHours.push((completedTimes[i] - completedTimes[i - 1]) / (1000 * 60 * 60))
    }
    const sortedIntervals = intervalsHours.slice().sort((a, b) => a - b)
    const pctAt = (p: number) => {
      if (sortedIntervals.length === 0) return null
      const idx = Math.min(sortedIntervals.length - 1, Math.max(0, Math.floor(p * (sortedIntervals.length - 1))))
      return sortedIntervals[idx]
    }
    const medianHours = pctAt(0.5)
    const p90Hours = pctAt(0.9)

    const intervalBuckets = {
      lt6h: 0,
      h6_24: 0,
      d1_3: 0,
      d3_7: 0,
      gt7d: 0,
    }
    for (const h of intervalsHours) {
      if (h < 6) intervalBuckets.lt6h += 1
      else if (h < 24) intervalBuckets.h6_24 += 1
      else if (h < 24 * 3) intervalBuckets.d1_3 += 1
      else if (h < 24 * 7) intervalBuckets.d3_7 += 1
      else intervalBuckets.gt7d += 1
    }

    // Trend: compare last chunk vs previous chunk (7d for 28/90, 3d for 7)
    const chunk = range === '7d' ? 3 : 7
    const lastChunk = daySeries.slice(-chunk)
    const prevChunk = daySeries.slice(-(chunk * 2), -chunk)
    const lastCompleted = lastChunk.reduce((s, x) => s + x.completed, 0)
    const prevCompleted = prevChunk.reduce((s, x) => s + x.completed, 0)
    const trendPct = prevCompleted === 0 ? (lastCompleted > 0 ? 100 : 0) : ((lastCompleted - prevCompleted) / prevCompleted) * 100

    const topTasks = Array.from(taskCounts.entries())
      .map(([taskId, c]) => ({
        taskId,
        title: taskTitleById.get(taskId) ?? 'Tarea',
        completed: c.completed,
        uncompleted: c.uncompleted,
        reopens: c.reopens,
      }))
      .sort((a, b) => b.completed - a.completed)
      .slice(0, 5)

    let bestWeekday = 0
    let worstWeekday = 0
    for (let i = 1; i < 7; i++) {
      if (weekdayCompleted[i] > weekdayCompleted[bestWeekday]) bestWeekday = i
      if (weekdayCompleted[i] < weekdayCompleted[worstWeekday]) worstWeekday = i
    }

    return {
      start,
      end,
      daySeries,
      weekSeries,
      totalCompleted,
      totalUncompleted,
      activeDays,
      activeDaysPct,
      streak,
      best,
      hourCompleted,
      hourUncompleted,
      weekdayCompleted,
      bestWeekday,
      worstWeekday,
      bestWindowStart,
      bestWindowSum,
      medianHours,
      p90Hours,
      intervalBuckets,
      lastCompleted,
      prevCompleted,
      trendPct,
      topTasks,
      source: hasEvents ? ('events' as const) : ('none' as const),
    }
  }, [selectedRoutineId, taskEvents, hasEvents, range, taskTitleById])

  const routinesRanking = useMemo(() => {
    if (!hasEvents) return []
    const windowDays = windowDaysFromRange(range)
    const end = startOfDayLocal(new Date())
    const start = new Date(end)
    start.setDate(end.getDate() - (windowDays - 1))

    const byRoutineDay = new Map<string, Map<string, number>>()
    const byRoutineCompleted = new Map<string, number>()
    for (const ev of taskEvents) {
      if (ev.event_type !== 'completed') continue
      const t = new Date(ev.created_at).getTime()
      if (t < start.getTime() || t >= end.getTime() + 1000 * 60 * 60 * 24) continue
      const dayKey = dateKeyLocal(new Date(ev.created_at))
      const dayMap = byRoutineDay.get(ev.routine_id) ?? new Map<string, number>()
      dayMap.set(dayKey, (dayMap.get(dayKey) ?? 0) + 1)
      byRoutineDay.set(ev.routine_id, dayMap)
      byRoutineCompleted.set(ev.routine_id, (byRoutineCompleted.get(ev.routine_id) ?? 0) + 1)
    }

    const chunk = range === '7d' ? 3 : 7
    const endDay = startOfDayLocal(new Date())
    const makeDayKeys = (count: number, offsetFromEnd: number) => {
      const keys: string[] = []
      for (let i = count - 1; i >= 0; i--) {
        const d = new Date(endDay)
        d.setDate(endDay.getDate() - (offsetFromEnd + i))
        keys.push(dateKeyLocal(d))
      }
      return keys
    }
    const lastKeys = makeDayKeys(chunk, 0)
    const prevKeys = makeDayKeys(chunk, chunk)

    return routines
      .map((r) => {
        const dayMap = byRoutineDay.get(r.id) ?? new Map<string, number>()
        const activeDays = dayMap.size
        const activePct = windowDays ? (activeDays / windowDays) * 100 : 0
        const completed = byRoutineCompleted.get(r.id) ?? 0
        const last = lastKeys.reduce((s, k) => s + (dayMap.get(k) ?? 0), 0)
        const prev = prevKeys.reduce((s, k) => s + (dayMap.get(k) ?? 0), 0)
        const trendPct = prev === 0 ? (last > 0 ? 100 : 0) : ((last - prev) / prev) * 100
        return { id: r.id, title: r.title, activePct, completed, trendPct }
      })
      .sort((a, b) => {
        if (b.activePct !== a.activePct) return b.activePct - a.activePct
        return b.completed - a.completed
      })
      .slice(0, 7)
  }, [hasEvents, taskEvents, routines, range])

  const selectedRoutineInsight = useMemo(() => {
    if (selectedRoutineAnalytics.source !== 'events') {
      return selectedRoutine ? 'Activa el historial real para generar insights.' : 'Activa el historial real para generar insights globales.'
    }

    const weekdayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
    const bestDayName = weekdayNames[selectedRoutineAnalytics.bestWeekday] ?? '—'
    const worstDayName = weekdayNames[selectedRoutineAnalytics.worstWeekday] ?? '—'

    const windowStart = selectedRoutineAnalytics.bestWindowStart
    const bestWindow = `${formatHour(windowStart)}–${formatHour((windowStart + 3) % 24)}`
    const trend = Math.round(selectedRoutineAnalytics.trendPct)
    const trendText =
      trend >= 15
        ? `Tendencia fuerte: +${trend}%`
        : trend <= -15
          ? `Atención: ${trend}%`
          : `Tendencia: ${trend >= 0 ? '+' : ''}${trend}%`
    const consistency = Math.round(selectedRoutineAnalytics.activeDaysPct)
    const consistencyText =
      consistency >= 70
        ? `Muy constante (${consistency}%)`
        : consistency >= 40
          ? `Constancia media (${consistency}%)`
          : `Baja constancia (${consistency}%)`

    const bestDay = selectedRoutineAnalytics.weekdayCompleted[selectedRoutineAnalytics.bestWeekday] ?? 0
    const worstDay = selectedRoutineAnalytics.weekdayCompleted[selectedRoutineAnalytics.worstWeekday] ?? 0

    const counts = selectedRoutineAnalytics.weekdayCompleted
    const weekend = (counts[0] ?? 0) + (counts[6] ?? 0)
    const total = counts.reduce((s, x) => s + x, 0)
    const weekdaySum = total - weekend
    const weekdayAvg = weekdaySum / 5
    const hasWeekendDrop = total > 0 && weekend < weekdayAvg * 1.4
    const hasSundayDrop = (counts[0] ?? 0) === worstDay && total > 0 && (counts[0] ?? 0) < (bestDay || 1) * 0.5

    const weekdayText = hasSundayDrop
      ? `Cae los domingos. Mejor: ${bestDayName}.`
      : hasWeekendDrop
        ? `Baja en fines de semana. Mejor: ${bestDayName}.`
        : worstDay === 0 && bestDay > 0
          ? `Mejor: ${bestDayName}. Cae los ${worstDayName}.`
          : `Mejor: ${bestDayName}. Más bajo: ${worstDayName}.`

    const prefix = selectedRoutine ? '' : 'Vista global: '
    return `${prefix}Rinde mejor ${bestWindow}. ${weekdayText} ${consistencyText}. ${trendText}.`
  }, [selectedRoutine, selectedRoutineAnalytics])

  const complianceTooltip = usePopoverTooltip()
  const hourlyTooltip = usePopoverTooltip()
  const {
    containerRef: heatmapContainerRef,
    tip: heatmapTip,
    show: showHeatmapTooltip,
    hide: hideHeatmapTooltip,
  } = usePopoverTooltip()

  const selectedRoutineKpis = useMemo(() => {
    const total = selectedRoutineTasks.length
    const done = selectedRoutineTasks.filter((t) => t.is_done).length
    const pct = total ? (done / total) * 100 : 0

    const hasEvents = Array.isArray(taskEvents) && taskEvents.length > 0
    const windowDays = 14
    const end = new Date()
    end.setHours(0, 0, 0, 0)

    const days: Date[] = []
    for (let i = windowDays - 1; i >= 0; i--) {
      const d = new Date(end)
      d.setDate(end.getDate() - i)
      days.push(d)
    }

    const doneCounts = new Map<string, number>()

    if (hasEvents) {
      for (const ev of taskEvents) {
        if (selectedRoutineId && ev.routine_id !== selectedRoutineId) continue
        if (ev.event_type !== 'completed') continue
        const d = new Date(ev.created_at)
        const key = dateKeyLocal(d)
        doneCounts.set(key, (doneCounts.get(key) ?? 0) + 1)
      }
    }

    const daily = days.map((d) => {
      const key = dateKeyLocal(d)
      return { key, date: d, count: doneCounts.get(key) ?? 0 }
    })
    const max = daily.reduce((m, x) => Math.max(m, x.count), 0)

    let streak = 0
    for (let i = daily.length - 1; i >= 0; i--) {
      if (daily[i].count > 0) streak++
      else break
    }

    let best = 0
    let run = 0
    for (const c of daily) {
      if (c.count > 0) {
        run++
        best = Math.max(best, run)
      } else {
        run = 0
      }
    }

    return {
      total,
      done,
      pct,
      daily,
      max,
      streak,
      best,
      source: hasEvents ? ('events' as const) : ('none' as const),
    }
  }, [selectedRoutineId, selectedRoutineTasks, taskEvents])

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

    const start = new Date(end)
    start.setDate(end.getDate() - (windowDays - 1))
    start.setHours(0, 0, 0, 0)

    // Render a stable week-aligned grid (GitHub-style): always show all boxes,
    // then fill as counts arrive.
    const weekStartsOn = prefs.weekStartsOn
    const gridStart = startOfWeekLocal(start, weekStartsOn)
    const gridEnd = endOfWeekLocal(end, weekStartsOn)

    const gridDays: Date[] = []
    for (let d = new Date(gridStart); d.getTime() <= gridEnd.getTime(); d = addDaysLocal(d, 1)) {
      gridDays.push(d)
    }

    const doneCounts = new Map<string, number>()
    const hasEvents = Array.isArray(taskEvents) && taskEvents.length > 0

    if (hasEvents) {
      for (const ev of taskEvents) {
        if (ev.event_type !== 'completed') continue
        const d = new Date(ev.created_at)
        const key = dateKeyLocal(d)
        doneCounts.set(key, (doneCounts.get(key) ?? 0) + 1)
      }
    } else {
      // Fallback: estimate using updated_at on tasks currently marked as done.
      for (const task of allTasks) {
        if (!task.is_done) continue
        const d = new Date(task.updated_at)
        const key = dateKeyLocal(d)
        doneCounts.set(key, (doneCounts.get(key) ?? 0) + 1)
      }
    }

    const counts = gridDays.map((d) => {
      const key = dateKeyLocal(d)
      const inRange = d.getTime() >= start.getTime() && d.getTime() <= end.getTime()
      return { key, date: d, count: inRange ? doneCounts.get(key) ?? 0 : 0, inRange }
    })
    const max = counts.reduce((m, x) => (x.inRange ? Math.max(m, x.count) : m), 0)

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

    return { counts, max, streak, best, source: hasEvents ? 'events' : ('estimated' as const) }
  }, [allTasks, taskEvents, range, prefs.weekStartsOn])

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

  const widgetOrder = prefs.widgetOrder.filter((id) => !prefs.widgetHidden[id])

  const struggleTasks = useMemo(() => {
    if (!taskEvents || taskEvents.length === 0) return [] as { taskId: string; title: string; score: number; hint: string }[]
    const windowDays = windowDaysFromRange(range)
    const end = startOfDayLocal(new Date())
    const start = new Date(end)
    start.setDate(end.getDate() - (windowDays - 1))

    const map = new Map<string, { completed: number; uncompleted: number; reopens: number; prev: 'completed' | 'uncompleted' | null }>()
    const filtered = taskEvents
      .filter((ev) => (!selectedRoutineId ? true : ev.routine_id === selectedRoutineId))
      .filter((ev) => {
        const t = new Date(ev.created_at).getTime()
        return t >= start.getTime() && t < end.getTime() + 1000 * 60 * 60 * 24
      })
      .slice()
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

    for (const ev of filtered) {
      const c = map.get(ev.routine_task_id) ?? { completed: 0, uncompleted: 0, reopens: 0, prev: null }
      if (c.prev === 'completed' && ev.event_type === 'uncompleted') c.reopens += 1
      c.prev = ev.event_type
      if (ev.event_type === 'completed') c.completed += 1
      else c.uncompleted += 1
      map.set(ev.routine_task_id, c)
    }

    return Array.from(map.entries())
      .map(([taskId, c]) => {
        const score = c.uncompleted + c.reopens * 2
        const title = taskTitleById.get(taskId) ?? 'Tarea'
        const hint = c.reopens > 0 ? 'Sugerencia: divídela en 2 pasos.' : 'Sugerencia: reduce la dificultad (hazlo más pequeño).'
        return { taskId, title, score, hint }
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 2)
  }, [taskEvents, selectedRoutineId, range, taskTitleById])

  const renderWidget = (id: DashboardWidgetId) => {
    if (id === 'today') {
      return widgetCardShell(
        id,
        'Hoy',
        'Tu foco inmediato: sesión + 1 tarea.',
        <div className="space-y-3">
          <div className={cn('rounded-lg p-3 ring-1', isDay ? 'bg-slate-50 ring-slate-200' : 'bg-white/5 ring-white/10')}>
            <div className={'text-xs ' + subtleText}>Riesgo</div>
            <div className={'mt-1 text-sm font-medium ' + panelText}>{riskText}</div>
          </div>

          <div className={cn('rounded-lg p-3 ring-1', isDay ? 'bg-slate-50 ring-slate-200' : 'bg-white/5 ring-white/10')}>
            <div className={'text-xs ' + subtleText}>Última actividad</div>
            <div className={'mt-1 text-sm font-medium ' + panelText}>
              {lastActivity ? lastActivity.toLocaleString() : '—'}
            </div>
          </div>

          {scheduledToday.length > 0 ? (
            <div className={cn('rounded-lg p-3 ring-1', isDay ? 'bg-slate-50 ring-slate-200' : 'bg-white/5 ring-white/10')}>
              <div className={'text-xs ' + subtleText}>Rutinas programadas</div>
              <div className="mt-2 space-y-2">
                {scheduledToday.map((r) => {
                  if (!r) return null
                  const tasks = tasksByRoutineId[r.id] ?? []
                  const done = tasks.filter((t) => t.is_done).length
                  return (
                    <div key={r.id} className="flex items-center justify-between gap-3">
                      <div>
                        <div className={'text-sm font-medium ' + panelText}>{r.title}</div>
                        <div className={'text-xs ' + subtleText}>{tasks.length} tareas • {done} hechas</div>
                      </div>
                      <Button variant="secondary" onClick={() => onStartSession(r.id)}>
                        Empezar
                      </Button>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className={cn('rounded-lg p-3 ring-1', isDay ? 'bg-slate-50 ring-slate-200' : 'bg-white/5 ring-white/10')}>
              <div className={'text-xs ' + subtleText}>Rutinas programadas</div>
              <div className={'mt-1 text-sm ' + panelText}>Aún no has programado rutinas para hoy.</div>
              <div className="mt-2">
                <Button variant="secondary" onClick={() => setCustomizeOpen(true)}>
                  Programar
                </Button>
              </div>
            </div>
          )}

          {todayFocus.length === 0 ? (
            <div className={'rounded-lg p-3 ring-1 ' + (isDay ? 'bg-white ring-slate-200' : 'bg-white/5 ring-white/10')}>
              <div className={'text-sm ' + panelText}>
                {routines.length === 0
                  ? 'Crea tu primera rutina para empezar.'
                  : 'No hay pendientes recientes. Puedes abrir una rutina y marcar una tarea para sumar hoy.'}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {todayFocus.slice(0, 6).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={
                    'flex w-full items-center justify-between gap-3 rounded-lg p-3 text-left ring-1 transition ' +
                    (isDay ? 'bg-white ring-slate-200 hover:bg-slate-50' : 'bg-white/5 ring-white/10 hover:bg-white/7')
                  }
                  onClick={() => {
                    if (offline) return
                    void setTaskDone({ id: t.id, routine_id: t.routine_id, is_done: !t.is_done })
                  }}
                  disabled={offline}
                >
                  <div className="flex items-center gap-3">
                    <input type="checkbox" checked={t.is_done} readOnly className={isDay ? '' : 'accent-cyan-300'} />
                    <div>
                      <div className={'text-sm font-medium ' + panelText}>{t.title}</div>
                      <div className={'text-xs ' + subtleText}>{routineTitleById.get(t.routine_id) ?? 'Rutina'}</div>
                    </div>
                  </div>
                  <div className={'text-xs ' + subtleText}>{offline ? 'Offline' : 'Tocar'}</div>
                </button>
              ))}
            </div>
          )}
        </div>,
        { className: 'lg:col-span-2' },
      )
    }

    if (id === 'upcoming') {
      const hasSchedule = Object.keys(prefs.routineScheduleById ?? {}).length > 0
      return widgetCardShell(
        id,
        'Próximo',
        'Agenda simple (7 días).',
        <div className="grid gap-3">
          <div className="grid grid-cols-7 gap-2">
            {next7Days.map((d) => {
              const list = scheduledRoutinesByDow.get(d.date.getDay()) ?? []
              const count = list.length
              return (
                <div
                  key={d.key}
                  className={
                    'rounded-lg p-2 text-center ring-1 ' +
                    (isDay ? 'bg-white ring-slate-200' : 'bg-white/5 ring-white/10')
                  }
                >
                  <div className={'text-[10px] ' + subtleText}>{d.label}</div>
                  <div className={'mt-1 text-sm font-semibold ' + (isDay ? 'text-slate-900' : 'text-white')}>{count}</div>
                  <div className={'text-[10px] ' + subtleText}>rutinas</div>
                </div>
              )
            })}
          </div>
          <div className={'text-xs ' + subtleText}>
            Tip: programa rutinas por días en “Personalizar”.
          </div>
          {!hasSchedule && routines.length > 0 ? (
            <div className="pt-1">
              <Button variant="secondary" onClick={applyDemoScheduleDefaults}>
                Autoprogramar
              </Button>
            </div>
          ) : null}
        </div>,
      )
    }

    if (id === 'streaks') {
      return widgetCardShell(
        id,
        'Rachas',
        'Consistencia en días con actividad.',
        <div className="grid gap-3 sm:grid-cols-2">
          <div className={cn('rounded-lg p-3 ring-1', isDay ? 'bg-slate-50 ring-slate-200' : 'bg-white/5 ring-white/10')}>
            <div className={'text-xs ' + subtleText}>Racha actual</div>
            <div className={'mt-1 text-2xl font-semibold ' + (isDay ? 'text-slate-900' : 'text-white')}>{streaks.current}</div>
            <div className={'mt-1 text-xs ' + subtleText}>{streaks.hasToday ? 'Ya sumaste hoy' : 'Aún no sumas hoy'}</div>
          </div>
          <div className={cn('rounded-lg p-3 ring-1', isDay ? 'bg-slate-50 ring-slate-200' : 'bg-white/5 ring-white/10')}>
            <div className={'text-xs ' + subtleText}>Mejor racha</div>
            <div className={'mt-1 text-2xl font-semibold ' + (isDay ? 'text-slate-900' : 'text-white')}>{streaks.best}</div>
            <div className={'mt-1 text-xs ' + subtleText}>Tu récord histórico</div>
          </div>
        </div>,
      )
    }

    if (id === 'goal') {
      return widgetCardShell(
        id,
        'Meta semanal',
        `Objetivo: ${prefs.weeklyGoal} tareas/semana.`,
        <div className="space-y-3">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className={'text-xs ' + subtleText}>Esta semana</div>
              <div className={'mt-1 text-xl font-semibold ' + (isDay ? 'text-slate-900' : 'text-white')}>
                {weekCounts.thisWeekCompleted} / {prefs.weeklyGoal}
              </div>
            </div>
            <div className={'text-xs ' + subtleText}>
              vs anterior: {weekCounts.prevWeekCompleted} ({Math.round(weekCounts.deltaPct)}%)
            </div>
          </div>

          <div className={'h-2 w-full rounded-full ' + (isDay ? 'bg-slate-200' : 'bg-white/10')}>
            <div
              className={'h-2 rounded-full bg-gradient-to-r from-cyan-400 to-violet-500'}
              style={{ width: `${Math.max(0, Math.min(100, weeklyProgressPct))}%` }}
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className={cn('rounded-lg p-3 ring-1', isDay ? 'bg-slate-50 ring-slate-200' : 'bg-white/5 ring-white/10')}>
              <div className={'text-xs ' + subtleText}>Consistencia</div>
              <div className={'mt-1 text-sm font-medium ' + panelText}>{Math.round(weekCounts.consistencyThis)}% de días activos</div>
            </div>
            <div className={cn('rounded-lg p-3 ring-1', isDay ? 'bg-slate-50 ring-slate-200' : 'bg-white/5 ring-white/10')}>
              <div className={'text-xs ' + subtleText}>Recomendación</div>
              <div className={'mt-1 text-sm font-medium ' + panelText}>
                {weekCounts.thisWeekCompleted === 0 ? 'Haz 1 tarea hoy para arrancar.' : 'Mantén el ritmo con una sesión corta.'}
              </div>
            </div>
          </div>
        </div>,
      )
    }

    if (id === 'achievements') {
      return widgetCardShell(
        id,
        'Logros',
        'Pequeñas victorias que suman.',
        <div className="grid gap-2">
          {achievements.map((a) => (
            <div
              key={a.id}
              className={
                'flex items-center justify-between gap-3 rounded-lg p-3 ring-1 ' +
                (isDay ? 'bg-white ring-slate-200' : 'bg-white/5 ring-white/10')
              }
            >
              <div>
                <div className={'text-sm font-medium ' + panelText}>{a.title}</div>
                <div className={'text-xs ' + subtleText}>{a.desc}</div>
              </div>
              <div className={'text-xs ' + (a.earned ? (isDay ? 'text-emerald-600' : 'text-emerald-300') : subtleText)}>
                {a.earned ? 'Logrado' : 'Pendiente'}
              </div>
            </div>
          ))}
        </div>,
      )
    }

    if (id === 'insights') {
      return widgetCardShell(
        id,
        'Insights accionables',
        'Qué hacer ahora + dónde mejorar.',
        <div className="space-y-3">
          <div className={cn('rounded-lg p-3 ring-1', isDay ? 'bg-slate-50 ring-slate-200' : 'bg-white/5 ring-white/10')}>
            <div className={'text-xs ' + subtleText}>Comparativa semanal</div>
            <div className={'mt-1 text-sm font-medium ' + panelText}>
              {weekCounts.thisWeekCompleted} completadas esta semana • {weekCounts.prevWeekCompleted} la anterior
            </div>
          </div>

          <div className={cn('rounded-lg p-3 ring-1', isDay ? 'bg-slate-50 ring-slate-200' : 'bg-white/5 ring-white/10')}>
            <div className={'text-xs ' + subtleText}>Mejor ventana horaria</div>
            <div className={'mt-1 text-sm font-medium ' + panelText}>
              {selectedRoutineAnalytics.source === 'events' ? `${formatHour(selectedRoutineAnalytics.bestWindowStart)}–${formatHour((selectedRoutineAnalytics.bestWindowStart + 2) % 24)}` : 'Activa historial real para calcularlo.'}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  if (selectedRoutineAnalytics.source !== 'events') return
                  prefs.setReminderHour(selectedRoutineAnalytics.bestWindowStart)
                  setReminderSaved(true)
                  window.setTimeout(() => setReminderSaved(false), 1500)
                }}
                disabled={selectedRoutineAnalytics.source !== 'events'}
              >
                Programar recordatorio en mi mejor hora
              </Button>
              {reminderSaved ? <div className={'text-xs ' + (isDay ? 'text-emerald-600' : 'text-emerald-300')}>Guardado</div> : null}
            </div>
          </div>

          <div className={cn('rounded-lg p-3 ring-1', isDay ? 'bg-slate-50 ring-slate-200' : 'bg-white/5 ring-white/10')}>
            <div className={'text-xs ' + subtleText}>Qué te está frenando</div>
            {struggleTasks.length === 0 ? (
              <div className={'mt-1 text-sm ' + panelText}>Aún no hay suficientes señales. Completa/uncompleta tareas para generar insights.</div>
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
        </div>,
      )
    }

    if (id === 'analytics') {
      const totalChecks = heatmap.counts.reduce((s, x) => (x.inRange ? s + x.count : s), 0)
      const activeDays = heatmap.counts.reduce((s, x) => (x.inRange && x.count > 0 ? s + 1 : s), 0)
      return widgetCardShell(
        id,
        'Analítica',
        'KPIs y tendencias.',
        loading ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <div className={cn('h-16 animate-pulse rounded-lg ring-1', isDay ? 'bg-slate-50 ring-slate-200' : 'bg-white/5 ring-white/10')} />
            <div className={cn('h-16 animate-pulse rounded-lg ring-1', isDay ? 'bg-slate-50 ring-slate-200' : 'bg-white/5 ring-white/10')} />
          </div>
        ) : (
          <div className="grid gap-2">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className={cn('rounded-lg p-3 ring-1', isDay ? 'bg-slate-50 ring-slate-200' : 'bg-white/5 ring-white/10')}>
                <div className={'text-xs ' + subtleText}>Checks (rango)</div>
                <div className={'mt-1 text-lg font-semibold ' + (isDay ? 'text-slate-900' : 'text-white')}>{totalChecks}</div>
              </div>
              <div className={cn('rounded-lg p-3 ring-1', isDay ? 'bg-slate-50 ring-slate-200' : 'bg-white/5 ring-white/10')}>
                <div className={'text-xs ' + subtleText}>Días activos</div>
                <div className={'mt-1 text-lg font-semibold ' + (isDay ? 'text-slate-900' : 'text-white')}>{activeDays}</div>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className={cn('rounded-lg p-3 ring-1', isDay ? 'bg-slate-50 ring-slate-200' : 'bg-white/5 ring-white/10')}>
                <div className={'text-xs ' + subtleText}>Racha</div>
                <div className={'mt-1 text-lg font-semibold ' + (isDay ? 'text-slate-900' : 'text-white')}>{heatmap.streak}d</div>
              </div>
              <div className={cn('rounded-lg p-3 ring-1', isDay ? 'bg-slate-50 ring-slate-200' : 'bg-white/5 ring-white/10')}>
                <div className={'text-xs ' + subtleText}>Mejor</div>
                <div className={'mt-1 text-lg font-semibold ' + (isDay ? 'text-slate-900' : 'text-white')}>{heatmap.best}d</div>
              </div>
            </div>
            <div className={'text-xs ' + subtleText}>Desplázate hacia abajo para ver gráficos detallados.</div>
          </div>
        ),
      )
    }

    // routines
    return widgetCardShell(
      id,
      'Rutinas',
      'Acceso rápido.',
      loading ? (
        <div className="grid gap-2">
          <div className={cn('h-12 animate-pulse rounded-lg ring-1', isDay ? 'bg-slate-50 ring-slate-200' : 'bg-white/5 ring-white/10')} />
          <div className={cn('h-12 animate-pulse rounded-lg ring-1', isDay ? 'bg-slate-50 ring-slate-200' : 'bg-white/5 ring-white/10')} />
        </div>
      ) : routines.length === 0 ? (
        <div className="flex items-center justify-between gap-3">
          <div className={'text-sm ' + panelText}>Crea tu primera rutina para empezar.</div>
          <Button variant="secondary" onClick={() => setCreateOpen(true)}>
            Crear
          </Button>
        </div>
      ) : (
        <div className="grid gap-3">
          <div className="space-y-2">
            {routines.slice(0, 3).map((r) => {
              const tasks = tasksByRoutineId[r.id] ?? []
              const done = tasks.filter((t) => t.is_done).length
              const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0
              return (
                <button
                  key={r.id}
                  type="button"
                  className={
                    'w-full rounded-lg p-3 text-left ring-1 transition ' +
                    (isDay ? 'bg-white ring-slate-200 hover:bg-slate-50' : 'bg-white/5 ring-white/10 hover:bg-white/10')
                  }
                  onClick={() => onStartSession(r.id)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className={'text-sm font-medium ' + panelText}>{r.title}</div>
                    <div className={'text-xs ' + subtleText}>{pct}%</div>
                  </div>
                  <div className={'mt-1 text-xs ' + subtleText}>
                    {tasks.length} tareas • {done} hechas
                  </div>
                  <div className={'mt-2 h-1.5 w-full rounded-full ' + (isDay ? 'bg-slate-200' : 'bg-white/10')}>
                    <div className="h-1.5 rounded-full bg-gradient-to-r from-cyan-400 to-violet-500" style={{ width: `${pct}%` }} />
                  </div>
                </button>
              )
            })}
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className={'text-xs ' + subtleText}>Abre una rutina para marcar tareas.</div>
            <Button variant="secondary" onClick={() => onStartSession(null)}>
              Ver todas
            </Button>
          </div>
        </div>
      ),
    )
  }

  function widgetCardShell(
    id: DashboardWidgetId,
    title: string,
    subtitle: string | null,
    body: ReactNode,
    opts?: { className?: string },
  ) {
    const collapsed = prefs.widgetCollapsed[id]
    const shellClass = 'overflow-hidden'
    const headerClass = cn(
      'flex w-full items-center justify-between gap-3 text-left',
      'rounded-lg px-0 py-0',
    )

    return (
      <Card key={id} className={cn(shellClass, opts?.className)}>
        <button
          type="button"
          className={headerClass}
          onClick={() => prefs.toggleWidgetCollapsed(id)}
        >
          <div className="p-4">
            <div className="text-sm font-semibold">{title}</div>
            {subtitle ? <div className={'text-xs ' + subtleText}>{subtitle}</div> : null}
          </div>
          <div className={'p-4 text-xs ' + subtleText}>{collapsed ? 'Mostrar' : 'Ocultar'}</div>
        </button>

        <div className={cn('px-4 pb-4', collapsed ? 'hidden' : 'block')}>
          {body}
        </div>
      </Card>
    )
  }

  return (
    <AppShell>
      <RoutineWizardModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(id) => onCreatedRoutine(id)}
      />

      <Modal
        open={customizeOpen}
        title="Personaliza tu dashboard"
        description="Configura metas, filtros y qué secciones ves primero."
        onClose={() => setCustomizeOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setCustomizeOpen(false)}>
              Cerrar
            </Button>
            <Button onClick={() => setCustomizeOpen(false)}>
              Aplicar
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <div className={cn('rounded-lg p-3 ring-1', isDay ? 'bg-slate-50 ring-slate-200' : 'bg-white/5 ring-white/10')}>
            <div className="text-sm font-semibold">Preferencias</div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <div className={'text-xs ' + subtleText}>Meta semanal (tareas)</div>
                <Input
                  type="number"
                  min={1}
                  value={prefs.weeklyGoal}
                  onChange={(e) => prefs.setWeeklyGoal(Number(e.target.value || 1))}
                />
              </div>

              <div>
                <div className={'text-xs ' + subtleText}>Semana inicia</div>
                <div className="mt-1 flex items-center gap-2">
                  <button
                    type="button"
                    className={rangeButtonClass(prefs.weekStartsOn === 1)}
                    onClick={() => prefs.setWeekStartsOn(1)}
                  >
                    Lunes
                  </button>
                  <button
                    type="button"
                    className={rangeButtonClass(prefs.weekStartsOn === 0)}
                    onClick={() => prefs.setWeekStartsOn(0)}
                  >
                    Domingo
                  </button>
                </div>
              </div>

              <div className="sm:col-span-2">
                <div className={'text-xs ' + subtleText}>Hora típica de recordatorio</div>
                <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Input
                    type="number"
                    min={0}
                    max={23}
                    placeholder="0-23"
                    value={prefs.reminderHour ?? ''}
                    onChange={(e) => {
                      const v = e.target.value.trim()
                      prefs.setReminderHour(v === '' ? null : Math.max(0, Math.min(23, Number(v))))
                    }}
                  />
                  <Button
                    variant="secondary"
                    onClick={() => {
                      prefs.setReminderHour(null)
                      setReminderSaved(false)
                    }}
                  >
                    Limpiar
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className={cn('rounded-lg p-3 ring-1', isDay ? 'bg-slate-50 ring-slate-200' : 'bg-white/5 ring-white/10')}>
            <div className="text-sm font-semibold">Programación por rutina</div>
            <div className={'mt-1 text-xs ' + subtleText}>Define qué rutinas quieres ver en “Hoy” y “Próximo”.</div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <div className={'text-xs ' + subtleText}>Rutina</div>
                <select
                  className={
                    'mt-1 w-full rounded-lg px-3 py-2 text-sm ring-1 ' +
                    (isDay ? 'bg-white ring-slate-200' : 'bg-slate-950/40 ring-white/10')
                  }
                  value={scheduleRoutineId ?? ''}
                  onChange={(e) => setScheduleRoutineId(e.target.value || null)}
                >
                  {routines.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title}
                    </option>
                  ))}
                </select>
              </div>

              {scheduleRoutineId ? (
                <>
                  <div className="sm:col-span-2">
                    <div className={'text-xs ' + subtleText}>Días</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {['D', 'L', 'M', 'X', 'J', 'V', 'S'].map((label, dow) => {
                        const current = prefs.routineScheduleById[scheduleRoutineId] as RoutineSchedule | undefined
                        const days = current?.daysOfWeek ?? []
                        const active = days.includes(dow)
                        return (
                          <button
                            key={dow}
                            type="button"
                            className={rangeButtonClass(active)}
                            onClick={() => {
                              const nextDays = active ? days.filter((x) => x !== dow) : [...days, dow].sort((a, b) => a - b)
                              prefs.setRoutineSchedule(scheduleRoutineId, { daysOfWeek: nextDays, hour: current?.hour ?? null })
                            }}
                          >
                            {label}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <div className={'text-xs ' + subtleText}>Hora (opcional)</div>
                    <Input
                      type="number"
                      min={0}
                      max={23}
                      placeholder="0-23"
                      value={prefs.routineScheduleById[scheduleRoutineId]?.hour ?? ''}
                      onChange={(e) => {
                        const raw = e.target.value.trim()
                        const nextHour = raw === '' ? null : Math.max(0, Math.min(23, Number(raw)))
                        const current = prefs.routineScheduleById[scheduleRoutineId] as RoutineSchedule | undefined
                        prefs.setRoutineSchedule(scheduleRoutineId, { daysOfWeek: current?.daysOfWeek ?? [], hour: nextHour })
                      }}
                    />
                  </div>
                </>
              ) : null}
            </div>
          </div>

          <div className={cn('rounded-lg p-3 ring-1', isDay ? 'bg-slate-50 ring-slate-200' : 'bg-white/5 ring-white/10')}>
            <div className="text-sm font-semibold">Secciones</div>
            <div className={'mt-1 text-xs ' + subtleText}>Oculta widgets o reordénalos arrastrando.</div>

            <div className="mt-3">
              <WidgetOrderEditor
                isDay={isDay}
                order={prefs.widgetOrder}
                hidden={prefs.widgetHidden}
                titleForId={(id) =>
                  id === 'today'
                    ? 'Hoy'
                    : id === 'upcoming'
                      ? 'Próximo'
                      : id === 'streaks'
                        ? 'Rachas'
                        : id === 'goal'
                          ? 'Meta semanal'
                          : id === 'achievements'
                            ? 'Logros'
                            : id === 'insights'
                              ? 'Insights'
                              : id === 'analytics'
                                ? 'Analítica'
                                : 'Rutinas'
                }
                onOrderChange={(next) => prefs.setWidgetOrder(next)}
                onToggleHidden={(id) => prefs.toggleWidgetHidden(id)}
              />
            </div>
          </div>
        </div>
      </Modal>

      <div className="mb-6">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-2xl font-semibold">Mi progreso</div>
              <div className={'text-sm ' + subtleText}>
                {name ? `Hola, ${name}. ` : 'Hola. '}
                Hoy cuenta: una tarea pequeña ya es progreso.
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" onClick={() => setCustomizeOpen(true)}>
                Personalizar
              </Button>
            </div>
          </div>

          <div
            className={cn(
              'sticky top-[58px] z-10 -mx-4 border-b px-4 py-2 backdrop-blur',
              isDay ? 'border-slate-200 bg-white/70' : 'border-white/10 bg-slate-900/60',
            )}
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" className={rangeButtonClass(prefs.scope === 'today')} onClick={() => prefs.setScope('today')}>
                  Hoy
                </button>
                <button type="button" className={rangeButtonClass(prefs.scope === 'week')} onClick={() => prefs.setScope('week')}>
                  Semana
                </button>
                <button type="button" className={rangeButtonClass(prefs.scope === 'month')} onClick={() => prefs.setScope('month')}>
                  Mes
                </button>

                <select
                  className={
                    'rounded-full px-3 py-1 text-xs ring-1 ' +
                    (isDay ? 'bg-white text-slate-700 ring-slate-200' : 'bg-white/90 text-slate-900 ring-white/20')
                  }
                  value={selectedRoutineId ?? ''}
                  onChange={(e) => {
                    didManualPickRoutineRef.current = true
                    selectRoutine(e.target.value ? e.target.value : null)
                  }}
                >
                  <option value="">Todas las rutinas</option>
                  {routines.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className={'text-xs ' + subtleText}>
                  {offline ? 'Modo offline (solo lectura)' : formatTimeAgo(lastSyncedAt) ? `Sincronizado ${formatTimeAgo(lastSyncedAt)}` : '—'}
                </div>
                <Button
                  variant="secondary"
                  onClick={() => void refreshAll({ since: new Date(Date.now() - 1000 * 60 * 60 * 24 * 120).toISOString() })}
                  disabled={loading}
                >
                  Reintentar
                </Button>
                <Button
                  className={cn(
                    'bg-gradient-to-r from-cyan-400 to-violet-500 text-slate-950 hover:from-cyan-300 hover:to-violet-400 focus:ring-cyan-300',
                    !isDay ? 'ring-1 ring-white/10' : '',
                  )}
                  onClick={() => setCreateOpen(true)}
                >
                  Nueva rutina
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <Card className="mb-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-rose-600">{error}</div>
            <Button
              variant="secondary"
              onClick={() => void refreshAll({ since: new Date(Date.now() - 1000 * 60 * 60 * 24 * 120).toISOString() })}
              disabled={loading}
            >
              Reintentar
            </Button>
          </div>
        </Card>
      ) : null}

      {showSeedTools && user ? (
        <Card className="mb-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold">Demo: poblar datos</div>
              <div className={'mt-1 text-xs ' + subtleText}>
                Crea rutinas/tareas “Demo:*” + eventos para ver los módulos con datos realistas.
              </div>
              {seedError ? <div className="mt-2 text-xs text-rose-600">{seedError}</div> : null}
              <div className={'mt-2 text-[11px] ' + subtleText}>
                Tip: en producción, abre <span className="font-mono">/app?seed</span> para mostrar este panel.
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={() => void onClearDemo()} disabled={seedBusy || loading}>
                Limpiar demo
              </Button>
              <Button variant="secondary" onClick={() => void onSeedDemo()} disabled={seedBusy || loading}>
                Poblar rápido
              </Button>
              <Button onClick={() => void onSeedFullDemo()} disabled={seedBusy || loading}>
                Poblar completo
              </Button>
            </div>
          </div>
        </Card>
      ) : null}



      <div className="mb-8" ref={routinePanelRef}>
        <RoutinePanel />
      </div>

      {widgetOrder.length > 0 ? <div className="mb-6 grid gap-4 lg:grid-cols-3">{widgetOrder.map(renderWidget)}</div> : null}

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
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

      <div className="mb-8">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-semibold">Analíticas por rutina</div>
            <div className={'text-xs ' + subtleText}>Selector + gráficas + insights</div>
          </div>

          <div className="flex items-center gap-2">
            <div className={'text-xs ' + subtleText}>Rutina</div>
            <select
              value={selectedRoutineId ?? ''}
              onChange={(e) => {
                didManualPickRoutineRef.current = true
                selectRoutine(e.target.value ? e.target.value : null)
              }}
              className={cn(
                'h-9 max-w-[260px] rounded-lg px-3 text-sm ring-1 outline-none transition focus:ring-2',
                isDay
                  ? 'bg-white text-slate-900 ring-slate-200 focus:ring-slate-400'
                  : 'bg-white/90 text-slate-900 ring-white/20 focus:ring-white/40',
              )}
            >
              <option value="">Selecciona…</option>
              {routines.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div
          className={cn(
            'mb-4 rounded-lg p-3 text-sm ring-1',
            isDay ? 'bg-slate-50 text-slate-700 ring-slate-200' : 'bg-white/5 text-slate-200 ring-white/10',
          )}
        >
          <div className={'text-xs ' + subtleText}>Insight automático</div>
          <div className={'mt-1 text-sm font-medium ' + panelText}>{selectedRoutineInsight}</div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <div>
            <div className="text-sm font-semibold">Rutina</div>
            <div className={'text-xs ' + subtleText}>Métricas puntuales por rutina</div>
          </div>

          <div className="mt-4">
            <div className={'text-sm font-semibold ' + panelText}>{selectedRoutine ? selectedRoutine.title : 'Todas las rutinas'}</div>
            <div className={'mt-2 grid grid-cols-3 gap-2'}>
              <div className={cn('rounded-lg p-3 ring-1', isDay ? 'bg-slate-50 ring-slate-200' : 'bg-white/5 ring-white/10')}>
                <div className={'text-xs ' + subtleText}>Tareas</div>
                <div className={'mt-1 text-lg font-semibold ' + kpiValueClass}>{selectedRoutineKpis.total}</div>
              </div>
              <div className={cn('rounded-lg p-3 ring-1', isDay ? 'bg-slate-50 ring-slate-200' : 'bg-white/5 ring-white/10')}>
                <div className={'text-xs ' + subtleText}>Hechas</div>
                <div className={'mt-1 text-lg font-semibold ' + kpiValueClass}>{selectedRoutineKpis.done}</div>
              </div>
              <div className={cn('rounded-lg p-3 ring-1', isDay ? 'bg-slate-50 ring-slate-200' : 'bg-white/5 ring-white/10')}>
                <div className={'text-xs ' + subtleText}>Cumpl.</div>
                <div className={'mt-1 text-lg font-semibold ' + kpiValueClass}>{formatPct(selectedRoutineKpis.pct)}</div>
              </div>
            </div>

            <div className={'mt-3 rounded-lg p-3 ring-1 ' + (isDay ? 'bg-slate-50 ring-slate-200' : 'bg-white/5 ring-white/10')}>
              <div className={'text-xs ' + subtleText}>Consistencia (rango seleccionado)</div>
              <div className={'mt-1 text-sm font-medium ' + panelText}>
                {selectedRoutineAnalytics.source === 'events' ? (
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <div className={'text-xs ' + subtleText}>Racha</div>
                      <div className={'text-sm font-semibold ' + panelText}>{selectedRoutineAnalytics.streak}d</div>
                    </div>
                    <div>
                      <div className={'text-xs ' + subtleText}>Mejor</div>
                      <div className={'text-sm font-semibold ' + panelText}>{selectedRoutineAnalytics.best}d</div>
                    </div>
                    <div>
                      <div className={'text-xs ' + subtleText}>Días activos</div>
                      <div className={'text-sm font-semibold ' + panelText}>{formatPct(selectedRoutineAnalytics.activeDaysPct)}</div>
                    </div>
                  </div>
                ) : (
                  'Activa el historial real para ver consistencia y gráficas.'
                )}
              </div>
            </div>

            {selectedRoutineKpis.total === 0 ? (
              <div className={'mt-3 rounded-lg p-3 text-sm ring-1 ' + (isDay ? 'bg-slate-50 text-slate-700 ring-slate-200' : 'bg-white/5 text-slate-200 ring-white/10')}>
                {selectedRoutine ? 'Esta rutina aún no tiene tareas. Añade tareas para empezar a medir.' : 'Aún no tienes tareas. Crea una rutina y añade tareas para empezar.'}
              </div>
            ) : null}
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold">Cumplimiento</div>
              <div className={'text-xs ' + subtleText}>Completed vs uncompleted (rango seleccionado)</div>
            </div>
            <div className={'text-xs ' + subtleText}>
              {selectedRoutineAnalytics.source === 'events' ? 'historial real' : 'sin historial'}
            </div>
          </div>

          {selectedRoutineAnalytics.source !== 'events' ? (
            <div className={'mt-4 rounded-lg p-3 text-sm ring-1 ' + (isDay ? 'bg-slate-50 text-slate-700 ring-slate-200' : 'bg-white/5 text-slate-200 ring-white/10')}>
              Aún no hay historial real para graficar (ejecuta el SQL en Supabase y marca tareas como completadas).
            </div>
          ) : (
            <div className="mt-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {range === '90d' ? (
                    <Tooltip isDay={isDay} content="Para 90 días se recomienda vista semanal" className="inline-flex">
                      <button
                        type="button"
                        className={cn(rangeButtonClass(effectiveRoutineGranularity === 'day'), 'cursor-not-allowed opacity-50')}
                        disabled
                      >
                        Día
                      </button>
                    </Tooltip>
                  ) : (
                    <button
                      type="button"
                      className={rangeButtonClass(effectiveRoutineGranularity === 'day')}
                      onClick={() => setRoutineGranularity('day')}
                    >
                      Día
                    </button>
                  )}
                  <button type="button" className={rangeButtonClass(effectiveRoutineGranularity === 'week')} onClick={() => setRoutineGranularity('week')}>
                    Semana
                  </button>
                </div>
                <div className={'text-xs ' + subtleText}>
                  {selectedRoutineAnalytics.totalCompleted} completed • {selectedRoutineAnalytics.totalUncompleted} uncompleted
                  <span className={'ml-2 ' + subtleText}>
                    ({selectedRoutineAnalytics.trendPct >= 0 ? '+' : ''}
                    {Math.round(selectedRoutineAnalytics.trendPct)}%)
                  </span>
                </div>
              </div>

              {(() => {
                const series = effectiveRoutineGranularity === 'week' ? selectedRoutineAnalytics.weekSeries : selectedRoutineAnalytics.daySeries
                const maxTotal = series.reduce((m, x) => Math.max(m, x.completed + x.uncompleted), 0)
                const limited = effectiveRoutineGranularity === 'day' ? series.slice(-Math.min(series.length, 28)) : series
                const n = Math.max(1, limited.length)
                const W = 320
                const H = 96
                const padX = 10
                const padY = 10
                const innerW = W - padX * 2
                const innerH = H - padY * 2
                const gap = n > 20 ? 1 : 2
                const barW = Math.max(2, Math.floor((innerW - gap * (n - 1)) / n))

                const cFill = isDay ? 'rgb(34 211 238)' : 'rgba(34, 211, 238, 0.75)'
                const uFill = isDay ? 'rgb(251 113 133)' : 'rgba(251, 113, 133, 0.65)'

                return (
                  <>
                    <div ref={complianceTooltip.containerRef} className="relative">
                      <svg
                        viewBox={`0 0 ${W} ${H}`}
                        className="h-24 w-full"
                        role="img"
                        aria-label="Cumplimiento"
                        onMouseLeave={complianceTooltip.hide}
                      >
                        <rect x="0" y="0" width={W} height={H} rx="12" className={isDay ? 'fill-slate-50' : 'fill-white/5'} />
                        {limited.map((d, i) => {
                        const total = d.completed + d.uncompleted
                        const t = maxTotal ? total / maxTotal : 0
                        const totalH = Math.round(innerH * clamp01(t))
                        const completedH = total ? Math.round((d.completed / total) * totalH) : 0
                        const uncompletedH = totalH - completedH

                        const x = padX + i * (barW + gap)
                        const yTop = padY + (innerH - totalH)
                        const yCompleted = yTop + uncompletedH
                        return (
                          <g
                            key={d.key}
                            onMouseMove={(e) =>
                              complianceTooltip.show(e, {
                                title: d.key,
                                lines: [`Hechas: ${d.completed}`, `No hechas: ${d.uncompleted}`],
                              })
                            }
                            onPointerDown={(e) => {
                              if (e.pointerType === 'touch' || e.pointerType === 'pen') {
                                complianceTooltip.show(e, {
                                  title: d.key,
                                  lines: [`Hechas: ${d.completed}`, `No hechas: ${d.uncompleted}`],
                                })
                              }
                            }}
                          >
                            {uncompletedH > 0 ? (
                              <rect x={x} y={yTop} width={barW} height={uncompletedH} rx={3} fill={uFill} opacity={0.85} />
                            ) : null}
                            {completedH > 0 ? (
                              <rect x={x} y={yCompleted} width={barW} height={completedH} rx={3} fill={cFill} opacity={0.95} />
                            ) : null}
                          </g>
                        )
                        })}
                      </svg>

                      {complianceTooltip.tip ? (
                        <div
                          className={cn(
                            'pointer-events-none absolute z-20 min-w-40 max-w-64 rounded-lg px-3 py-2 text-xs shadow-lg ring-1',
                            isDay ? 'bg-white text-slate-900 ring-slate-200' : 'bg-slate-900 text-slate-100 ring-white/10',
                          )}
                          style={{
                            left: complianceTooltip.tip.x,
                            top: complianceTooltip.tip.y,
                            transform: 'translate(-50%, calc(-100% - 10px))',
                          }}
                        >
                          <div className="font-semibold">{complianceTooltip.tip.title}</div>
                          {complianceTooltip.tip.lines.map((l) => (
                            <div key={l} className={cn('mt-0.5', isDay ? 'text-slate-600' : 'text-slate-300')}>
                              {l}
                            </div>
                          ))}
                          <div
                            className={cn(
                              'absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 ring-1',
                              isDay ? 'bg-white ring-slate-200' : 'bg-slate-900 ring-white/10',
                            )}
                          />
                        </div>
                      ) : null}
                    </div>

                    <div className={'mt-2 flex items-center justify-between text-xs ' + subtleText}>
                      <div>{limited[0]?.key}</div>
                      <div>{effectiveRoutineGranularity === 'day' ? 'Últimos 28 días máx.' : 'Semanas del rango'}</div>
                      <div>Hoy</div>
                    </div>

                    <div className={'mt-2 flex items-center gap-3 text-xs ' + subtleText}>
                      <div className="flex items-center gap-1">
                        <span className="inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: cFill as unknown as string }} />
                        <span>Completed</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: uFill as unknown as string }} />
                        <span>Uncompleted</span>
                      </div>
                    </div>
                  </>
                )
              })()}
            </div>
          )}
        </Card>
      </div>
      </div>

      <div className="mb-8 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold">Hora típica</div>
              <div className={'text-xs ' + subtleText}>Histograma por hora (completed)</div>
            </div>
            <div className={'text-xs ' + subtleText}>
              {selectedRoutine && selectedRoutineAnalytics.source === 'events'
                ? `Mejor franja: ${formatHour(selectedRoutineAnalytics.bestWindowStart)}–${formatHour((selectedRoutineAnalytics.bestWindowStart + 3) % 24)}`
                : '—'}
            </div>
          </div>

          {!selectedRoutine ? (
            <div className={'mt-4 rounded-lg p-3 text-sm ring-1 ' + (isDay ? 'bg-slate-50 text-slate-700 ring-slate-200' : 'bg-white/5 text-slate-200 ring-white/10')}>
              Selecciona una rutina para ver su histograma.
            </div>
          ) : selectedRoutineAnalytics.source !== 'events' ? (
            <div className={'mt-4 rounded-lg p-3 text-sm ring-1 ' + (isDay ? 'bg-slate-50 text-slate-700 ring-slate-200' : 'bg-white/5 text-slate-200 ring-white/10')}>
              Sin historial real aún. Se habilita al ejecutar el SQL y marcar tareas.
            </div>
          ) : (
            <div className="mt-4">
              {(() => {
                const W = 420
                const H = 100
                const padX = 10
                const padY = 10
                const innerW = W - padX * 2
                const innerH = H - padY * 2
                const n = 24
                const gap = 2
                const barW = Math.floor((innerW - gap * (n - 1)) / n)
                const max = Math.max(1, ...selectedRoutineAnalytics.hourCompleted)
                const fill = isDay ? 'rgb(34 211 238)' : 'rgba(34, 211, 238, 0.75)'
                const windowStart = selectedRoutineAnalytics.bestWindowStart

                return (
                  <>
                    <div ref={hourlyTooltip.containerRef} className="relative">
                      <svg
                        viewBox={`0 0 ${W} ${H}`}
                        className="h-24 w-full"
                        role="img"
                        aria-label="Histograma por hora"
                        onMouseLeave={hourlyTooltip.hide}
                      >
                        <rect x="0" y="0" width={W} height={H} rx="12" className={isDay ? 'fill-slate-50' : 'fill-white/5'} />
                        {selectedRoutineAnalytics.hourCompleted.map((v, i) => {
                        const h = Math.round(innerH * clamp01(v / max))
                        const x = padX + i * (barW + gap)
                        const y = padY + (innerH - h)
                        const isHot = i === windowStart || i === (windowStart + 1) % 24 || i === (windowStart + 2) % 24
                        return (
                          <g
                            key={i}
                            onMouseMove={(e) =>
                              hourlyTooltip.show(e, {
                                title: formatHour(i),
                                lines: [`Hechas: ${v}`, isHot ? 'En tu mejor franja' : ''],
                              })
                            }
                            onPointerDown={(e) => {
                              if (e.pointerType === 'touch' || e.pointerType === 'pen') {
                                hourlyTooltip.show(e, {
                                  title: formatHour(i),
                                  lines: [`Hechas: ${v}`, isHot ? 'En tu mejor franja' : ''],
                                })
                              }
                            }}
                          >
                            <rect x={x} y={y} width={barW} height={h} rx={3} fill={fill} opacity={isHot ? 1 : 0.55} />
                          </g>
                        )
                        })}
                      </svg>

                      {hourlyTooltip.tip ? (
                        <div
                          className={cn(
                            'pointer-events-none absolute z-20 min-w-36 max-w-64 rounded-lg px-3 py-2 text-xs shadow-lg ring-1',
                            isDay ? 'bg-white text-slate-900 ring-slate-200' : 'bg-slate-900 text-slate-100 ring-white/10',
                          )}
                          style={{
                            left: hourlyTooltip.tip.x,
                            top: hourlyTooltip.tip.y,
                            transform: 'translate(-50%, calc(-100% - 10px))',
                          }}
                        >
                          <div className="font-semibold">{hourlyTooltip.tip.title}</div>
                          {hourlyTooltip.tip.lines
                            .filter(Boolean)
                            .map((l) => (
                              <div key={l} className={cn('mt-0.5', isDay ? 'text-slate-600' : 'text-slate-300')}>
                                {l}
                              </div>
                            ))}
                          <div
                            className={cn(
                              'absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 ring-1',
                              isDay ? 'bg-white ring-slate-200' : 'bg-slate-900 ring-white/10',
                            )}
                          />
                        </div>
                      ) : null}
                    </div>
                    <div className={'mt-2 flex items-center justify-between text-xs ' + subtleText}>
                      <div>00</div>
                      <div>12</div>
                      <div>23</div>
                    </div>
                  </>
                )
              })()}
            </div>
          )}
        </Card>

        <Card className="lg:col-span-1">
          <div>
            <div className="text-sm font-semibold">Regularidad</div>
            <div className={'text-xs ' + subtleText}>Tiempo entre completados</div>
          </div>

          {selectedRoutineAnalytics.source !== 'events' ? (
            <div className={'mt-4 rounded-lg p-3 text-sm ring-1 ' + (isDay ? 'bg-slate-50 text-slate-700 ring-slate-200' : 'bg-white/5 text-slate-200 ring-white/10')}>
              Sin historial real aún.
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              <div className={cn('rounded-lg p-3 ring-1', isDay ? 'bg-slate-50 ring-slate-200' : 'bg-white/5 ring-white/10')}>
                <div className={'text-xs ' + subtleText}>Mediana</div>
                <div className={'mt-1 text-sm font-semibold ' + panelText}>
                  {selectedRoutineAnalytics.medianHours == null ? '—' : `${Math.round(selectedRoutineAnalytics.medianHours)}h`}
                </div>
              </div>
              <div className={cn('rounded-lg p-3 ring-1', isDay ? 'bg-slate-50 ring-slate-200' : 'bg-white/5 ring-white/10')}>
                <div className={'text-xs ' + subtleText}>P90</div>
                <div className={'mt-1 text-sm font-semibold ' + panelText}>
                  {selectedRoutineAnalytics.p90Hours == null ? '—' : `${Math.round(selectedRoutineAnalytics.p90Hours)}h`}
                </div>
              </div>

              {(() => {
                const b = selectedRoutineAnalytics.intervalBuckets
                const items: Array<{ label: string; value: number }> = [
                  { label: '<6h', value: b.lt6h },
                  { label: '6–24h', value: b.h6_24 },
                  { label: '1–3d', value: b.d1_3 },
                  { label: '3–7d', value: b.d3_7 },
                  { label: '>7d', value: b.gt7d },
                ]
                const total = items.reduce((s, x) => s + x.value, 0)
                const max = Math.max(1, ...items.map((x) => x.value))
                const fill = isDay ? 'rgb(34 211 238)' : 'rgba(34, 211, 238, 0.75)'
                return (
                  <div className={cn('rounded-lg p-3 ring-1', isDay ? 'bg-slate-50 ring-slate-200' : 'bg-white/5 ring-white/10')}>
                    <div className={'text-xs ' + subtleText}>Distribución</div>
                    <div className="mt-2 space-y-2">
                      {items.map((it) => (
                        <Tooltip key={it.label} isDay={isDay} content={`${it.label}: ${it.value} intervalos`} className="block">
                        <div className="flex items-center gap-2">
                          <div className={'w-10 text-xs ' + subtleText}>{it.label}</div>
                          <div className={'h-2 flex-1 rounded-full ' + (isDay ? 'bg-slate-200' : 'bg-white/10')}>
                            <div className="h-2 rounded-full" style={{ width: `${Math.round((it.value / max) * 100)}%`, backgroundColor: fill as unknown as string, opacity: 0.9 }} />
                          </div>
                          <div className={'w-10 text-right text-xs ' + subtleText}>{total ? Math.round((it.value / total) * 100) : 0}%</div>
                        </div>
                        </Tooltip>
                      ))}
                    </div>
                  </div>
                )
              })()}
            </div>
          )}
        </Card>
      </div>

      <div className="mb-8 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div>
            <div className="text-sm font-semibold">Top tareas</div>
            <div className={'text-xs ' + subtleText}>Más completadas, re-open y desmarcadas</div>
          </div>

          {selectedRoutineAnalytics.source !== 'events' ? (
            <div className={'mt-4 rounded-lg p-3 text-sm ring-1 ' + (isDay ? 'bg-slate-50 text-slate-700 ring-slate-200' : 'bg-white/5 text-slate-200 ring-white/10')}>
              Sin historial real aún.
            </div>
          ) : selectedRoutineAnalytics.topTasks.length === 0 ? (
            <div className={'mt-4 rounded-lg p-3 text-sm ring-1 ' + (isDay ? 'bg-slate-50 text-slate-700 ring-slate-200' : 'bg-white/5 text-slate-200 ring-white/10')}>
              Aún no hay eventos en este rango.
            </div>
          ) : (
            <div className="mt-4 overflow-hidden rounded-lg ring-1 ring-inset ring-slate-200/70 dark:ring-white/10">
              <div className={cn('grid grid-cols-12 gap-2 px-3 py-2 text-xs', isDay ? 'bg-slate-50 text-slate-600' : 'bg-white/5 text-slate-300')}>
                <div className="col-span-6">Tarea</div>
                <div className="col-span-2 text-right">Completed</div>
                <div className="col-span-2 text-right">Uncompleted</div>
                <div className="col-span-2 text-right">Re-open</div>
              </div>
              <div className={cn('divide-y', isDay ? 'divide-slate-200' : 'divide-white/10')}>
                {selectedRoutineAnalytics.topTasks.map((t) => (
                  <div key={t.taskId} className={cn('grid grid-cols-12 gap-2 px-3 py-2 text-sm', isDay ? 'bg-white' : 'bg-transparent')}>
                    <Tooltip isDay={isDay} content={t.title} className="col-span-6">
                      <div className={'truncate ' + panelText}>{t.title}</div>
                    </Tooltip>
                    <div className={'col-span-2 text-right ' + panelText}>{t.completed}</div>
                    <div className={'col-span-2 text-right ' + panelText}>{t.uncompleted}</div>
                    <div className={'col-span-2 text-right ' + panelText}>{t.reopens}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        <Card className="lg:col-span-1">
          <div>
            <div className="text-sm font-semibold">Comparativa</div>
            <div className={'text-xs ' + subtleText}>Ranking de rutinas (rango)</div>
          </div>

          {!hasEvents ? (
            <div className={'mt-4 rounded-lg p-3 text-sm ring-1 ' + (isDay ? 'bg-slate-50 text-slate-700 ring-slate-200' : 'bg-white/5 text-slate-200 ring-white/10')}>
              Activa historial real para ranking.
            </div>
          ) : routinesRanking.length === 0 ? (
            <div className={'mt-4 rounded-lg p-3 text-sm ring-1 ' + (isDay ? 'bg-slate-50 text-slate-700 ring-slate-200' : 'bg-white/5 text-slate-200 ring-white/10')}>
              Aún no hay suficientes datos.
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {routinesRanking.map((r, idx) => (
                <Tooltip
                  key={r.id}
                  isDay={isDay}
                  className="block"
                  content={`Activos ${Math.round(r.activePct)}% • Completed ${r.completed} • Tendencia ${r.trendPct >= 0 ? '+' : ''}${Math.round(r.trendPct)}%`}
                >
                <div className={cn('rounded-lg p-3 ring-1', isDay ? 'bg-slate-50 ring-slate-200' : 'bg-white/5 ring-white/10')}>
                  <div className="flex items-center justify-between gap-3">
                    <div className={'text-sm font-medium ' + panelText}>
                      {idx + 1}. {r.title}
                    </div>
                    <div className={'text-xs ' + subtleText}>
                      {r.trendPct >= 0 ? '+' : ''}
                      {Math.round(r.trendPct)}%
                    </div>
                  </div>
                  <div className={'mt-1 flex items-center justify-between text-xs ' + subtleText}>
                    <div>Activos: {Math.round(r.activePct)}%</div>
                    <div>Completed: {r.completed}</div>
                  </div>
                </div>
                </Tooltip>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="mb-8">
        <Card>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold">Actividad</div>
              <div className={'text-xs ' + subtleText}>
                Checks por día ({heatmap.source === 'events' ? 'historial real' : 'estimado'})
              </div>
            </div>
            <div className={'text-xs ' + subtleText}>Rango: {range}</div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <div ref={heatmapContainerRef} className="relative inline-block" onMouseLeave={hideHeatmapTooltip}>
              <div className="inline-grid grid-flow-col grid-rows-7 gap-1">
                {heatmap.counts.map((c) => (
                  <div
                    key={c.key}
                    onMouseMove={(e) => {
                      if (!c.inRange) return
                      showHeatmapTooltip(e, { title: c.key, lines: [`Checks: ${c.count}`] })
                    }}
                    onPointerDown={(e) => {
                      if (!c.inRange) return
                      if (e.pointerType === 'touch' || e.pointerType === 'pen') {
                        showHeatmapTooltip(e, { title: c.key, lines: [`Checks: ${c.count}`] })
                      }
                    }}
                    className={
                      'h-3 w-3 rounded-sm ring-1 transition-colors duration-500 ' +
                      heatCellClass(c.count) +
                      ' ' +
                      (isDay ? 'ring-slate-200' : 'ring-white/10') +
                      (c.inRange ? '' : ' opacity-25')
                    }
                  />
                ))}
              </div>

              {heatmapTip ? (
                <div
                  className={cn(
                    'pointer-events-none absolute z-20 min-w-36 max-w-64 rounded-lg px-3 py-2 text-xs shadow-lg ring-1',
                    isDay ? 'bg-white text-slate-900 ring-slate-200' : 'bg-slate-900 text-slate-100 ring-white/10',
                  )}
                  style={{
                    left: heatmapTip.x,
                    top: heatmapTip.y,
                    transform: 'translate(-50%, calc(-100% - 10px))',
                  }}
                >
                  <div className="font-semibold">{heatmapTip.title}</div>
                  {heatmapTip.lines.map((l) => (
                    <div key={l} className={cn('mt-0.5', isDay ? 'text-slate-600' : 'text-slate-300')}>
                      {l}
                    </div>
                  ))}
                  <div
                    className={cn(
                      'absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 ring-1',
                      isDay ? 'bg-white ring-slate-200' : 'bg-slate-900 ring-white/10',
                    )}
                  />
                </div>
              ) : null}
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

    </AppShell>
  )
}
