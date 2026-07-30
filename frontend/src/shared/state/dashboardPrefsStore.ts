import { create } from 'zustand';

export type TimeScope = 'today' | 'week' | 'month';
export type WeekStartsOn = 0 | 1; // 0=Sun, 1=Mon

export type DashboardWidgetId =
  | 'today'
  | 'upcoming'
  | 'streaks'
  | 'goal'
  | 'achievements'
  | 'insights'
  | 'analytics'
  | 'routines';

export type RoutineSchedule = {
  daysOfWeek: number[]; // 0=Sun..6=Sat
  hour: number | null; // 0..23
};

type DashboardPrefsState = {
  scope: TimeScope;
  weekStartsOn: WeekStartsOn;
  weeklyGoal: number;

  widgetOrder: DashboardWidgetId[];
  widgetHidden: Record<DashboardWidgetId, boolean>;
  widgetCollapsed: Record<DashboardWidgetId, boolean>;

  routineScheduleById: Record<string, RoutineSchedule>;

  routinePanelCollapsed: boolean;
  favoriteRoutineIds: string[];

  setScope: (scope: TimeScope) => void;
  setWeekStartsOn: (v: WeekStartsOn) => void;
  setWeeklyGoal: (v: number) => void;

  toggleWidgetHidden: (id: DashboardWidgetId) => void;
  toggleWidgetCollapsed: (id: DashboardWidgetId) => void;
  moveWidget: (id: DashboardWidgetId, direction: 'up' | 'down') => void;
  setWidgetOrder: (order: DashboardWidgetId[]) => void;

  setRoutineSchedule: (routineId: string, schedule: RoutineSchedule) => void;

  setRoutinePanelCollapsed: (collapsed: boolean) => void;
  toggleFavoriteRoutine: (routineId: string) => void;
};

const STORAGE_KEY = 'nr-dashboard-prefs-v1';

const defaultOrder: DashboardWidgetId[] = [
  'today',
  'upcoming',
  'streaks',
  'goal',
  'achievements',
  'insights',
  'analytics',
  'routines',
];

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function persist(get: () => DashboardPrefsState) {
  try {
    const state = get();
    const data = {
      scope: state.scope,
      weekStartsOn: state.weekStartsOn,
      weeklyGoal: state.weeklyGoal,
      widgetOrder: state.widgetOrder,
      widgetHidden: state.widgetHidden,
      widgetCollapsed: state.widgetCollapsed,
      routineScheduleById: state.routineScheduleById,
      routinePanelCollapsed: state.routinePanelCollapsed,
      favoriteRoutineIds: state.favoriteRoutineIds,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

export const useDashboardPrefsStore = create<DashboardPrefsState>((set, get) => {
  const fromStorage = safeParse<Partial<DashboardPrefsState>>(
    typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null,
  );

  const initialOrder =
    Array.isArray(fromStorage?.widgetOrder) && fromStorage?.widgetOrder.length
      ? // keep only known ids
        fromStorage.widgetOrder.filter((x): x is DashboardWidgetId =>
          defaultOrder.includes(x as DashboardWidgetId),
        )
      : defaultOrder;

  const initialHidden = (fromStorage?.widgetHidden ?? {}) as Partial<
    Record<DashboardWidgetId, boolean>
  >;
  const initialCollapsed = (fromStorage?.widgetCollapsed ?? {}) as Partial<
    Record<DashboardWidgetId, boolean>
  >;

  return {
    scope: (fromStorage?.scope as TimeScope) ?? 'today',
    weekStartsOn: (fromStorage?.weekStartsOn as WeekStartsOn) ?? 1,
    weeklyGoal:
      typeof fromStorage?.weeklyGoal === 'number'
        ? Math.max(1, Math.round(fromStorage.weeklyGoal))
        : 12,

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
    // Collapsed-by-default widgets are the ones that are pure noise on a brand-new account
    // (nothing to show until there's real history). "today" and "routines" stay open because
    // they're the ones a first-time user can actually act on. Only applies to accounts that
    // have never saved a preference yet — `...initialCollapsed` below overrides every one of
    // these for anyone who already has a stored choice, new or not.
    widgetCollapsed: {
      today: false,
      upcoming: true,
      streaks: true,
      goal: true,
      achievements: true,
      insights: true,
      analytics: true,
      routines: false,
      ...initialCollapsed,
    },

    routineScheduleById: (fromStorage?.routineScheduleById ?? {}) as Record<
      string,
      RoutineSchedule
    >,

    routinePanelCollapsed: fromStorage?.routinePanelCollapsed === true,
    favoriteRoutineIds: Array.isArray(fromStorage?.favoriteRoutineIds)
      ? fromStorage.favoriteRoutineIds
      : [],

    setScope: (scope) => {
      set({ scope });
      persist(get);
    },
    setWeekStartsOn: (v) => {
      set({ weekStartsOn: v });
      persist(get);
    },
    setWeeklyGoal: (v) => {
      const next = Math.max(1, Math.round(v));
      set({ weeklyGoal: next });
      persist(get);
    },
    toggleWidgetHidden: (id) => {
      set((s) => ({ widgetHidden: { ...s.widgetHidden, [id]: !s.widgetHidden[id] } }));
      persist(get);
    },
    toggleWidgetCollapsed: (id) => {
      set((s) => ({ widgetCollapsed: { ...s.widgetCollapsed, [id]: !s.widgetCollapsed[id] } }));
      persist(get);
    },
    moveWidget: (id, direction) => {
      set((s) => {
        const order = s.widgetOrder.slice();
        const idx = order.indexOf(id);
        if (idx === -1) return s;
        const nextIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (nextIdx < 0 || nextIdx >= order.length) return s;
        const tmp = order[idx];
        order[idx] = order[nextIdx];
        order[nextIdx] = tmp;
        return { widgetOrder: order };
      });
      persist(get);
    },

    setWidgetOrder: (order) => {
      const next = Array.isArray(order)
        ? order.filter((x): x is DashboardWidgetId => defaultOrder.includes(x as DashboardWidgetId))
        : defaultOrder;

      // Ensure any missing defaults are appended.
      const withAll = next.slice();
      for (const id of defaultOrder) {
        if (!withAll.includes(id)) withAll.push(id);
      }

      set({ widgetOrder: withAll });
      persist(get);
    },

    setRoutineSchedule: (routineId, schedule) => {
      set((s) => ({ routineScheduleById: { ...s.routineScheduleById, [routineId]: schedule } }));
      persist(get);
    },

    setRoutinePanelCollapsed: (collapsed) => {
      set({ routinePanelCollapsed: collapsed });
      persist(get);
    },
    toggleFavoriteRoutine: (routineId) => {
      set((s) => ({
        favoriteRoutineIds: s.favoriteRoutineIds.includes(routineId)
          ? s.favoriteRoutineIds.filter((id) => id !== routineId)
          : [...s.favoriteRoutineIds, routineId],
      }));
      persist(get);
    },
  };
});

export function useDashboardPrefs() {
  return useDashboardPrefsStore();
}
