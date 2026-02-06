import { create } from 'zustand'

export type TimeScope = 'today' | 'week' | 'month'
export type WeekStartsOn = 0 | 1 // 0=Sun, 1=Mon

export type DashboardWidgetId =
  | 'today'
  | 'upcoming'
  | 'streaks'
  | 'goal'
  | 'achievements'
  | 'insights'
  | 'analytics'
  | 'routines'

export type RoutineSchedule = {
  daysOfWeek: number[] // 0=Sun..6=Sat
  hour: number | null // 0..23
}

type DashboardPrefsState = {
  scope: TimeScope
  weekStartsOn: WeekStartsOn
  weeklyGoal: number
  reminderHour: number | null

  widgetOrder: DashboardWidgetId[]
  widgetHidden: Record<DashboardWidgetId, boolean>
  widgetCollapsed: Record<DashboardWidgetId, boolean>

  routineScheduleById: Record<string, RoutineSchedule>

  setScope: (scope: TimeScope) => void
  setWeekStartsOn: (v: WeekStartsOn) => void
  setWeeklyGoal: (v: number) => void
  setReminderHour: (v: number | null) => void

  toggleWidgetHidden: (id: DashboardWidgetId) => void
  toggleWidgetCollapsed: (id: DashboardWidgetId) => void
  moveWidget: (id: DashboardWidgetId, direction: 'up' | 'down') => void
  setWidgetOrder: (order: DashboardWidgetId[]) => void

  setRoutineSchedule: (routineId: string, schedule: RoutineSchedule) => void
}

const STORAGE_KEY = 'nr-dashboard-prefs-v1'

const defaultOrder: DashboardWidgetId[] = [
  'today',
  'upcoming',
  'streaks',
  'goal',
  'achievements',
  'insights',
  'analytics',
  'routines',
]

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function persist(get: () => DashboardPrefsState) {
  try {
    const state = get()
    const data = {
      scope: state.scope,
      weekStartsOn: state.weekStartsOn,
      weeklyGoal: state.weeklyGoal,
      reminderHour: state.reminderHour,
      widgetOrder: state.widgetOrder,
      widgetHidden: state.widgetHidden,
      widgetCollapsed: state.widgetCollapsed,
      routineScheduleById: state.routineScheduleById,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // ignore
  }
}

export const useDashboardPrefsStore = create<DashboardPrefsState>((set, get) => {
  const fromStorage = safeParse<Partial<DashboardPrefsState>>(typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null)

  const initialOrder =
    Array.isArray(fromStorage?.widgetOrder) && fromStorage?.widgetOrder.length
      ? // keep only known ids
        fromStorage.widgetOrder.filter((x): x is DashboardWidgetId => defaultOrder.includes(x as DashboardWidgetId))
      : defaultOrder

  const initialHidden = (fromStorage?.widgetHidden ?? {}) as Partial<Record<DashboardWidgetId, boolean>>
  const initialCollapsed = (fromStorage?.widgetCollapsed ?? {}) as Partial<Record<DashboardWidgetId, boolean>>

  return {
    scope: (fromStorage?.scope as TimeScope) ?? 'today',
    weekStartsOn: (fromStorage?.weekStartsOn as WeekStartsOn) ?? 1,
    weeklyGoal: typeof fromStorage?.weeklyGoal === 'number' ? Math.max(1, Math.round(fromStorage.weeklyGoal)) : 12,
    reminderHour: typeof fromStorage?.reminderHour === 'number' ? fromStorage.reminderHour : null,

    widgetOrder: initialOrder,
    widgetHidden: {
      today: false,
      upcoming: false,
      streaks: false,
      goal: false,
      achievements: false,
      insights: false,
      analytics: false,
      routines: false,
      ...initialHidden,
    },
    widgetCollapsed: {
      today: false,
      upcoming: true,
      streaks: false,
      goal: false,
      achievements: true,
      insights: false,
      analytics: true,
      routines: false,
      ...initialCollapsed,
    },

    routineScheduleById: (fromStorage?.routineScheduleById ?? {}) as Record<string, RoutineSchedule>,

    setScope: (scope) => {
      set({ scope })
      persist(get)
    },
    setWeekStartsOn: (v) => {
      set({ weekStartsOn: v })
      persist(get)
    },
    setWeeklyGoal: (v) => {
      const next = Math.max(1, Math.round(v))
      set({ weeklyGoal: next })
      persist(get)
    },
    setReminderHour: (v) => {
      set({ reminderHour: v })
      persist(get)
    },

    toggleWidgetHidden: (id) => {
      set((s) => ({ widgetHidden: { ...s.widgetHidden, [id]: !s.widgetHidden[id] } }))
      persist(get)
    },
    toggleWidgetCollapsed: (id) => {
      set((s) => ({ widgetCollapsed: { ...s.widgetCollapsed, [id]: !s.widgetCollapsed[id] } }))
      persist(get)
    },
    moveWidget: (id, direction) => {
      set((s) => {
        const order = s.widgetOrder.slice()
        const idx = order.indexOf(id)
        if (idx === -1) return s
        const nextIdx = direction === 'up' ? idx - 1 : idx + 1
        if (nextIdx < 0 || nextIdx >= order.length) return s
        const tmp = order[idx]
        order[idx] = order[nextIdx]
        order[nextIdx] = tmp
        return { widgetOrder: order }
      })
      persist(get)
    },

    setWidgetOrder: (order) => {
      const next = Array.isArray(order)
        ? order.filter((x): x is DashboardWidgetId => defaultOrder.includes(x as DashboardWidgetId))
        : defaultOrder

      // Ensure any missing defaults are appended.
      const withAll = next.slice()
      for (const id of defaultOrder) {
        if (!withAll.includes(id)) withAll.push(id)
      }

      set({ widgetOrder: withAll })
      persist(get)
    },

    setRoutineSchedule: (routineId, schedule) => {
      set((s) => ({ routineScheduleById: { ...s.routineScheduleById, [routineId]: schedule } }))
      persist(get)
    },
  }
})

export function useDashboardPrefs() {
  return useDashboardPrefsStore()
}
