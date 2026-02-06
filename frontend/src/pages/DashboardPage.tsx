import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '@/features/auth/authStore'
import { RoutineFormModal } from '@/features/routines/components'
import { RoutinePanel } from '@/features/routines/components/RoutinePanel'
import { useRoutines } from '@/features/routines/routinesStore'
import { AppShell } from '@/shared/layout'
import { cn } from '@/shared/lib/cn'
import { useUiStore } from '@/shared/state/uiStore'
import { Button, Card, Tooltip } from '@/shared/ui'

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
    tasksByRoutineId,
    allTasks,
    taskEvents,
    loadRoutines,
    loadAllTasks,
    loadTaskEvents,
    loadTasks,
    selectRoutine,
    addRoutine,
    setTaskDone,
  } = useRoutines()

  const [range, setRange] = useState<RangeKey>('28d')
  const [createOpen, setCreateOpen] = useState(false)
  const [routineGranularity, setRoutineGranularity] = useState<BucketGranularity>(() => (range === '90d' ? 'week' : 'day'))
  const effectiveRoutineGranularity: BucketGranularity = range === '90d' ? 'week' : routineGranularity

  useEffect(() => {
    void loadRoutines()
    void loadAllTasks()
    // Pro analytics path: task completion history (heatmap/streak).
    // If the table isn't deployed yet, this will fail and we fall back to updated_at estimation.
    void loadTaskEvents({
      since: new Date(Date.now() - 1000 * 60 * 60 * 24 * 120).toISOString(),
    })
  }, [loadRoutines, loadAllTasks, loadTaskEvents])

  useEffect(() => {
    if (selectedRoutineId) void loadTasks(selectedRoutineId)
  }, [selectedRoutineId, loadTasks])

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

  const selectedRoutine = useMemo(
    () => routines.find((r) => r.id === selectedRoutineId) ?? null,
    [routines, selectedRoutineId],
  )

  const selectedRoutineTasks = useMemo(() => {
    if (!selectedRoutineId) return []
    return tasksByRoutineId[selectedRoutineId] ?? []
  }, [selectedRoutineId, tasksByRoutineId])

  const hasEvents = Array.isArray(taskEvents) && taskEvents.length > 0

  const selectedRoutineAnalytics = useMemo(() => {
    const windowDays = windowDaysFromRange(range)
    const end = startOfDayLocal(new Date())
    const start = new Date(end)
    start.setDate(end.getDate() - (windowDays - 1))

    const selectedId = selectedRoutineId
    const events = selectedId && hasEvents
      ? taskEvents
          .filter((ev) => ev.routine_id === selectedId)
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
    if (!selectedRoutine) return 'Selecciona una rutina para ver insights automáticos.'
    if (selectedRoutineAnalytics.source !== 'events') return 'Activa el historial real para generar insights.'

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

    return `Rinde mejor ${bestWindow}. ${weekdayText} ${consistencyText}. ${trendText}.`
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

    if (selectedRoutineId && hasEvents) {
      for (const ev of taskEvents) {
        if (ev.routine_id !== selectedRoutineId) continue
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

    const days: Date[] = []
    for (let i = windowDays - 1; i >= 0; i--) {
      const d = new Date(end)
      d.setDate(end.getDate() - i)
      days.push(d)
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

    return { counts, max, streak, best, source: hasEvents ? 'events' : 'estimated' as const }
  }, [allTasks, taskEvents, range])

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
            <div className={'text-sm ' + subtleText}>
              {name ? `Hola, ${name}. ` : 'Hola. '}
              ¿Estás listo para seguir de cerca tus rutinas y tareas?
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
            <button type="button" className={rangeButtonClass(range === '7d')} onClick={() => setRange('7d')}>
              7 días
            </button>
            <button type="button" className={rangeButtonClass(range === '28d')} onClick={() => setRange('28d')}>
              28 días
            </button>
            <button type="button" className={rangeButtonClass(range === '90d')} onClick={() => setRange('90d')}>
              90 días
            </button>
            {routines.length > 0 ? (
              <Button
                className={cn(
                  'w-full bg-gradient-to-r from-cyan-400 to-violet-500 text-slate-950 hover:from-cyan-300 hover:to-violet-400 focus:ring-cyan-300 sm:ml-2 sm:w-auto',
                  !isDay ? 'ring-1 ring-white/10' : '',
                )}
                onClick={() => setCreateOpen(true)}
                disabled={!user || loading}
              >
                Nueva rutina
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {error ? (
        <Card className="mb-6">
          <div className="text-sm text-rose-600">{error}</div>
        </Card>
      ) : null}

      {routines.length === 0 ? (
        <Card className="mb-6">
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
            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={() => setCreateOpen(true)}
                className={cn(
                  'w-full bg-gradient-to-r from-cyan-400 to-violet-500 text-slate-950 hover:from-cyan-300 hover:to-violet-400 focus:ring-cyan-300 sm:w-auto',
                  !isDay ? 'ring-1 ring-white/10' : '',
                )}
              >
                Crear rutina
              </Button>
              <Button variant="secondary" onClick={() => void loadRoutines()} className="w-full sm:w-auto">
                Refrescar
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      <div className="mb-6 lg:hidden">
        <RoutinePanel />
      </div>

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

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold">Hoy</div>
              <div className={'text-xs ' + subtleText}>Tu foco inmediato (pendientes recientes)</div>
            </div>
          </div>

          {todayFocus.length === 0 ? (
            <div className={'mt-4 rounded-lg p-3 ring-1 ' + (isDay ? 'bg-slate-50 text-slate-700 ring-slate-200' : 'bg-white/5 text-slate-200 ring-white/10')}>
              {routines.length === 0
                ? 'Aún no hay tareas porque no tienes rutinas. Crea tu primera rutina para empezar.'
                : 'No hay tareas pendientes. Crea o edita tareas dentro de una rutina para ver tu “Hoy” aquí.'}
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
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-semibold">Analíticas por rutina</div>
            <div className={'text-xs ' + subtleText}>Selector + gráficas + insights</div>
          </div>

          <div className="flex items-center gap-2">
            <div className={'text-xs ' + subtleText}>Rutina</div>
            <select
              value={selectedRoutineId ?? ''}
              onChange={(e) => selectRoutine(e.target.value ? e.target.value : null)}
              className={cn(
                'h-9 max-w-[260px] rounded-lg px-3 text-sm ring-1 outline-none transition focus:ring-2',
                isDay
                  ? 'bg-white text-slate-900 ring-slate-200 focus:ring-slate-400'
                  : 'bg-white/10 text-slate-50 ring-white/15 focus:ring-white/30',
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

          {selectedRoutine ? (
            <div className="mt-4">
              <div className={'text-sm font-semibold ' + panelText}>{selectedRoutine.title}</div>
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
                  Esta rutina aún no tiene tareas. Añade tareas para empezar a medir.
                </div>
              ) : null}
            </div>
          ) : (
            <div className={'mt-4 rounded-lg p-3 text-sm ring-1 ' + (isDay ? 'bg-slate-50 text-slate-700 ring-slate-200' : 'bg-white/5 text-slate-200 ring-white/10')}>
              Selecciona una rutina para ver sus métricas.
            </div>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold">Cumplimiento</div>
              <div className={'text-xs ' + subtleText}>Completed vs uncompleted (rango seleccionado)</div>
            </div>
            <div className={'text-xs ' + subtleText}>
              {selectedRoutine ? (selectedRoutineAnalytics.source === 'events' ? 'historial real' : 'sin historial') : '—'}
            </div>
          </div>

          {!selectedRoutine ? (
            <div className={'mt-4 rounded-lg p-3 text-sm ring-1 ' + (isDay ? 'bg-slate-50 text-slate-700 ring-slate-200' : 'bg-white/5 text-slate-200 ring-white/10')}>
              Selecciona una rutina para ver su gráfica.
            </div>
          ) : selectedRoutineAnalytics.source !== 'events' ? (
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

          {!selectedRoutine ? (
            <div className={'mt-4 rounded-lg p-3 text-sm ring-1 ' + (isDay ? 'bg-slate-50 text-slate-700 ring-slate-200' : 'bg-white/5 text-slate-200 ring-white/10')}>
              Selecciona una rutina para ver regularidad.
            </div>
          ) : selectedRoutineAnalytics.source !== 'events' ? (
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

          {!selectedRoutine ? (
            <div className={'mt-4 rounded-lg p-3 text-sm ring-1 ' + (isDay ? 'bg-slate-50 text-slate-700 ring-slate-200' : 'bg-white/5 text-slate-200 ring-white/10')}>
              Selecciona una rutina para ver top tareas.
            </div>
          ) : selectedRoutineAnalytics.source !== 'events' ? (
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
                    onMouseMove={(e) => showHeatmapTooltip(e, { title: c.key, lines: [`Checks: ${c.count}`] })}
                    onPointerDown={(e) => {
                      if (e.pointerType === 'touch' || e.pointerType === 'pen') {
                        showHeatmapTooltip(e, { title: c.key, lines: [`Checks: ${c.count}`] })
                      }
                    }}
                    className={
                      'h-3 w-3 rounded-sm ring-1 ' +
                      heatCellClass(c.count) +
                      ' ' +
                      (isDay ? 'ring-slate-200' : 'ring-white/10')
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

      <div className="hidden lg:block">
        <RoutinePanel />
      </div>
    </AppShell>
  )
}
