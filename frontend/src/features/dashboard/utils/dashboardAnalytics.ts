import type { User } from '@supabase/supabase-js';
import type { Routine, RoutineTask } from '@/shared/types/routines';
import type { RoutineTaskEvent } from '@/shared/types/routineEvents';
import type { RoutineSchedule, WeekStartsOn } from '@/shared/state/dashboardPrefsStore';
import {
  addDaysLocal,
  dateKeyLocal,
  endOfWeekLocal,
  formatHour,
  startOfDayLocal,
  startOfWeekLocal,
  windowDaysFromRange,
  type RangeKey,
} from './dashboardUtils';

// Pulled out of DashboardPage.tsx so the dashboard's analytics math is unit-testable and
// reusable without a mounted React tree. Every function here is pure: same inputs, same output.

export function computeNext7Days(now: Date = new Date()) {
  const days: { key: string; date: Date; label: string }[] = [];
  const weekdayShort = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const k = dateKeyLocal(d);
    const label = i === 0 ? 'Hoy' : `${weekdayShort[d.getDay()]} ${d.getDate()}`;
    days.push({ key: k, date: d, label });
  }
  return days;
}

export function computeScheduledRoutinesByDow(
  routines: Routine[],
  routineScheduleById: Record<string, RoutineSchedule>,
) {
  const byDow = new Map<number, string[]>();
  for (const r of routines) {
    const sched = routineScheduleById[r.id];
    if (!sched || !Array.isArray(sched.daysOfWeek) || sched.daysOfWeek.length === 0) continue;
    for (const dow of sched.daysOfWeek) {
      const list = byDow.get(dow) ?? [];
      list.push(r.id);
      byDow.set(dow, list);
    }
  }
  return byDow;
}

export function computeScheduledToday(
  scheduledRoutinesByDow: Map<number, string[]>,
  routines: Routine[],
  todayDow: number,
) {
  const ids = scheduledRoutinesByDow.get(todayDow) ?? [];
  return ids.map((id) => routines.find((r) => r.id === id)).filter((r): r is Routine => !!r);
}

export function deriveDisplayName(user: Pick<User, 'user_metadata' | 'email'> | null) {
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const raw =
    (typeof meta.first_name === 'string' ? meta.first_name : undefined) ||
    (typeof meta.full_name === 'string' ? meta.full_name : undefined) ||
    (typeof meta.name === 'string' ? meta.name : undefined) ||
    (typeof meta.username === 'string' ? meta.username : undefined);

  const email = user?.email;
  const fromEmail = email ? email.split('@')[0] : '';

  const base = (raw || fromEmail || '').trim();
  if (!base) return '';

  const token = base.split(/[._\-\s]+/).filter(Boolean)[0] ?? base;
  return token ? token.charAt(0).toUpperCase() + token.slice(1) : '';
}

export function buildRoutineTitleById(routines: Routine[]) {
  const map = new Map<string, string>();
  for (const r of routines) map.set(r.id, r.title);
  return map;
}

export function buildTaskTitleById(allTasks: RoutineTask[]) {
  const map = new Map<string, string>();
  for (const t of allTasks) map.set(t.id, t.title);
  return map;
}

export function computeTodayFocus(allTasks: RoutineTask[]) {
  const pending = allTasks
    .filter((t) => !t.is_done)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  return pending.slice(0, 7);
}

export function computeLastActivity(allTasks: RoutineTask[]) {
  if (allTasks.length === 0) return null;
  const newest = allTasks.reduce(
    (best, t) => (new Date(t.updated_at) > new Date(best.updated_at) ? t : best),
    allTasks[0]!,
  );
  return new Date(newest.updated_at);
}

export type StreakInfo = { current: number; best: number; hasToday: boolean };

export function buildAchievements(
  streaks: StreakInfo,
  weeklyGoal: number,
  thisWeekCompleted: number,
) {
  return [
    {
      id: 'streak3',
      title: '3 días seguidos',
      desc: 'Mantén el impulso inicial.',
      earned: streaks.best >= 3,
    },
    {
      id: 'streak7',
      title: 'Semana completa',
      desc: '7 días con actividad.',
      earned: streaks.best >= 7,
    },
    {
      id: 'goal',
      title: 'Meta semanal',
      desc: `Completa ${weeklyGoal} tareas esta semana.`,
      earned: thisWeekCompleted >= weeklyGoal,
    },
  ];
}

export function buildRiskText(streaks: StreakInfo) {
  return streaks.current <= 0
    ? 'Empieza hoy con una tarea pequeña.'
    : !streaks.hasToday
      ? 'Riesgo: hoy aún vas en 0. Completa 1 tarea para mantener la racha.'
      : 'Vas bien: ya sumaste actividad hoy.';
}

export function computeSelectedRoutineAnalytics(params: {
  taskEvents: RoutineTaskEvent[];
  selectedRoutineId: string | null;
  range: RangeKey;
  taskTitleById: Map<string, string>;
}) {
  const { taskEvents, selectedRoutineId, range, taskTitleById } = params;
  const hasEvents = Array.isArray(taskEvents) && taskEvents.length > 0;

  const windowDays = windowDaysFromRange(range);
  const end = startOfDayLocal(new Date());
  const start = new Date(end);
  start.setDate(end.getDate() - (windowDays - 1));

  const events = hasEvents
    ? taskEvents
        .filter((ev) => (selectedRoutineId ? ev.routine_id === selectedRoutineId : true))
        .filter((ev) => {
          const t = new Date(ev.created_at).getTime();
          return t >= start.getTime() && t < end.getTime() + 1000 * 60 * 60 * 24;
        })
        .slice()
    : [];

  // daily buckets (local days)
  const days: Date[] = [];
  for (let i = windowDays - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(end.getDate() - i);
    days.push(d);
  }

  const byDay = new Map<string, { completed: number; uncompleted: number }>();
  const byWeek = new Map<string, { completed: number; uncompleted: number; weekStart: Date }>();

  const hourCompleted = new Array<number>(24).fill(0);
  const hourUncompleted = new Array<number>(24).fill(0);

  const weekdayCompleted = new Array<number>(7).fill(0); // 0=Sun..6=Sat

  const perTaskEvents = new Map<
    string,
    { created_at: string; event_type: 'completed' | 'uncompleted' }[]
  >();
  const taskCounts = new Map<string, { completed: number; uncompleted: number; reopens: number }>();

  if (events.length > 0) {
    // Sort ascending for interval/reopen analysis.
    events.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    for (const ev of events) {
      const t = new Date(ev.created_at);
      const dayKey = dateKeyLocal(t);
      const current = byDay.get(dayKey) ?? { completed: 0, uncompleted: 0 };
      if (ev.event_type === 'completed') current.completed += 1;
      else current.uncompleted += 1;
      byDay.set(dayKey, current);

      const weekStart = startOfWeekLocal(t, 1);
      const weekKey = dateKeyLocal(weekStart);
      const w = byWeek.get(weekKey) ?? { completed: 0, uncompleted: 0, weekStart };
      if (ev.event_type === 'completed') w.completed += 1;
      else w.uncompleted += 1;
      byWeek.set(weekKey, w);

      const h = t.getHours();
      if (ev.event_type === 'completed') hourCompleted[h]! += 1;
      else hourUncompleted[h]! += 1;

      if (ev.event_type === 'completed') weekdayCompleted[t.getDay()]! += 1;

      const list = perTaskEvents.get(ev.routine_task_id) ?? [];
      list.push({ created_at: ev.created_at, event_type: ev.event_type });
      perTaskEvents.set(ev.routine_task_id, list);

      const c = taskCounts.get(ev.routine_task_id) ?? {
        completed: 0,
        uncompleted: 0,
        reopens: 0,
      };
      if (ev.event_type === 'completed') c.completed += 1;
      else c.uncompleted += 1;
      taskCounts.set(ev.routine_task_id, c);
    }

    // Reopens: completed -> uncompleted transitions per task
    for (const [taskId, list] of perTaskEvents.entries()) {
      const c = taskCounts.get(taskId);
      if (!c) continue;
      let prev: 'completed' | 'uncompleted' | null = null;
      for (const ev of list) {
        if (prev === 'completed' && ev.event_type === 'uncompleted') c.reopens += 1;
        prev = ev.event_type;
      }
      taskCounts.set(taskId, c);
    }
  }

  const daySeries = days.map((d) => {
    const key = dateKeyLocal(d);
    const val = byDay.get(key) ?? { completed: 0, uncompleted: 0 };
    return { key, date: d, ...val };
  });

  const weekSeries = Array.from(byWeek.values())
    .sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime())
    .map((w) => ({
      key: dateKeyLocal(w.weekStart),
      weekStart: w.weekStart,
      completed: w.completed,
      uncompleted: w.uncompleted,
    }));

  const totalCompleted = daySeries.reduce((s, x) => s + x.completed, 0);
  const totalUncompleted = daySeries.reduce((s, x) => s + x.uncompleted, 0);
  const activeDays = daySeries.filter((d) => d.completed > 0).length;
  const activeDaysPct = windowDays ? (activeDays / windowDays) * 100 : 0;

  // streak & best within range
  let streak = 0;
  for (let i = daySeries.length - 1; i >= 0; i--) {
    if (daySeries[i]!.completed > 0) streak++;
    else break;
  }
  let best = 0;
  let run = 0;
  for (const d of daySeries) {
    if (d.completed > 0) {
      run++;
      best = Math.max(best, run);
    } else {
      run = 0;
    }
  }

  // Hour best window (3-hour)
  let bestWindowStart = 0;
  let bestWindowSum = -1;
  for (let s = 0; s < 24; s++) {
    const sum = hourCompleted[s]! + hourCompleted[(s + 1) % 24]! + hourCompleted[(s + 2) % 24]!;
    if (sum > bestWindowSum) {
      bestWindowSum = sum;
      bestWindowStart = s;
    }
  }

  // intervals between completed events (overall, not per task)
  const completedTimes: number[] = [];
  for (const ev of events) {
    if (ev.event_type !== 'completed') continue;
    completedTimes.push(new Date(ev.created_at).getTime());
  }
  completedTimes.sort((a, b) => a - b);
  const intervalsHours: number[] = [];
  for (let i = 1; i < completedTimes.length; i++) {
    intervalsHours.push((completedTimes[i]! - completedTimes[i - 1]!) / (1000 * 60 * 60));
  }
  const sortedIntervals = intervalsHours.slice().sort((a, b) => a - b);
  const pctAt = (p: number) => {
    if (sortedIntervals.length === 0) return null;
    const idx = Math.min(
      sortedIntervals.length - 1,
      Math.max(0, Math.floor(p * (sortedIntervals.length - 1))),
    );
    return sortedIntervals[idx]!;
  };
  const medianHours = pctAt(0.5);
  const p90Hours = pctAt(0.9);

  const intervalBuckets = {
    lt6h: 0,
    h6_24: 0,
    d1_3: 0,
    d3_7: 0,
    gt7d: 0,
  };
  for (const h of intervalsHours) {
    if (h < 6) intervalBuckets.lt6h += 1;
    else if (h < 24) intervalBuckets.h6_24 += 1;
    else if (h < 24 * 3) intervalBuckets.d1_3 += 1;
    else if (h < 24 * 7) intervalBuckets.d3_7 += 1;
    else intervalBuckets.gt7d += 1;
  }

  // Trend: compare last chunk vs previous chunk (7d for 28/90, 3d for 7)
  const chunk = range === '7d' ? 3 : 7;
  const lastChunk = daySeries.slice(-chunk);
  const prevChunk = daySeries.slice(-(chunk * 2), -chunk);
  const lastCompleted = lastChunk.reduce((s, x) => s + x.completed, 0);
  const prevCompleted = prevChunk.reduce((s, x) => s + x.completed, 0);
  const trendPct =
    prevCompleted === 0
      ? lastCompleted > 0
        ? 100
        : 0
      : ((lastCompleted - prevCompleted) / prevCompleted) * 100;

  const topTasks = Array.from(taskCounts.entries())
    .map(([taskId, c]) => ({
      taskId,
      title: taskTitleById.get(taskId) ?? 'Tarea',
      completed: c.completed,
      uncompleted: c.uncompleted,
      reopens: c.reopens,
    }))
    .sort((a, b) => b.completed - a.completed)
    .slice(0, 5);

  let bestWeekday = 0;
  let worstWeekday = 0;
  for (let i = 1; i < 7; i++) {
    if (weekdayCompleted[i]! > weekdayCompleted[bestWeekday]!) bestWeekday = i;
    if (weekdayCompleted[i]! < weekdayCompleted[worstWeekday]!) worstWeekday = i;
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
  };
}

export type SelectedRoutineAnalytics = ReturnType<typeof computeSelectedRoutineAnalytics>;

export function computeRoutinesRanking(params: {
  taskEvents: RoutineTaskEvent[];
  routines: Routine[];
  range: RangeKey;
}) {
  const { taskEvents, routines, range } = params;
  const hasEvents = Array.isArray(taskEvents) && taskEvents.length > 0;
  if (!hasEvents) return [];

  const windowDays = windowDaysFromRange(range);
  const end = startOfDayLocal(new Date());
  const start = new Date(end);
  start.setDate(end.getDate() - (windowDays - 1));

  const byRoutineDay = new Map<string, Map<string, number>>();
  const byRoutineCompleted = new Map<string, number>();
  for (const ev of taskEvents) {
    if (ev.event_type !== 'completed') continue;
    const t = new Date(ev.created_at).getTime();
    if (t < start.getTime() || t >= end.getTime() + 1000 * 60 * 60 * 24) continue;
    const dayKey = dateKeyLocal(new Date(ev.created_at));
    const dayMap = byRoutineDay.get(ev.routine_id) ?? new Map<string, number>();
    dayMap.set(dayKey, (dayMap.get(dayKey) ?? 0) + 1);
    byRoutineDay.set(ev.routine_id, dayMap);
    byRoutineCompleted.set(ev.routine_id, (byRoutineCompleted.get(ev.routine_id) ?? 0) + 1);
  }

  const chunk = range === '7d' ? 3 : 7;
  const endDay = startOfDayLocal(new Date());
  const makeDayKeys = (count: number, offsetFromEnd: number) => {
    const keys: string[] = [];
    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(endDay);
      d.setDate(endDay.getDate() - (offsetFromEnd + i));
      keys.push(dateKeyLocal(d));
    }
    return keys;
  };
  const lastKeys = makeDayKeys(chunk, 0);
  const prevKeys = makeDayKeys(chunk, chunk);

  return routines
    .map((r) => {
      const dayMap = byRoutineDay.get(r.id) ?? new Map<string, number>();
      const activeDays = dayMap.size;
      const activePct = windowDays ? (activeDays / windowDays) * 100 : 0;
      const completed = byRoutineCompleted.get(r.id) ?? 0;
      const last = lastKeys.reduce((s, k) => s + (dayMap.get(k) ?? 0), 0);
      const prev = prevKeys.reduce((s, k) => s + (dayMap.get(k) ?? 0), 0);
      const trendPct = prev === 0 ? (last > 0 ? 100 : 0) : ((last - prev) / prev) * 100;
      return { id: r.id, title: r.title, activePct, completed, trendPct };
    })
    .sort((a, b) => {
      if (b.activePct !== a.activePct) return b.activePct - a.activePct;
      return b.completed - a.completed;
    })
    .slice(0, 7);
}

export function buildSelectedRoutineInsight(
  selectedRoutine: Routine | null,
  analytics: SelectedRoutineAnalytics,
) {
  if (analytics.source !== 'events') {
    return selectedRoutine
      ? 'Activa el historial real para generar insights.'
      : 'Activa el historial real para generar insights globales.';
  }

  const weekdayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const bestDayName = weekdayNames[analytics.bestWeekday] ?? '—';
  const worstDayName = weekdayNames[analytics.worstWeekday] ?? '—';

  const windowStart = analytics.bestWindowStart;
  const bestWindow = `${formatHour(windowStart)}–${formatHour((windowStart + 3) % 24)}`;
  const trend = Math.round(analytics.trendPct);
  const trendText =
    trend >= 15
      ? `Tendencia fuerte: +${trend}%`
      : trend <= -15
        ? `Atención: ${trend}%`
        : `Tendencia: ${trend >= 0 ? '+' : ''}${trend}%`;
  const consistency = Math.round(analytics.activeDaysPct);
  const consistencyText =
    consistency >= 70
      ? `Muy constante (${consistency}%)`
      : consistency >= 40
        ? `Constancia media (${consistency}%)`
        : `Baja constancia (${consistency}%)`;

  const bestDay = analytics.weekdayCompleted[analytics.bestWeekday] ?? 0;
  const worstDay = analytics.weekdayCompleted[analytics.worstWeekday] ?? 0;

  const counts = analytics.weekdayCompleted;
  const weekend = (counts[0] ?? 0) + (counts[6] ?? 0);
  const total = counts.reduce((s, x) => s + x, 0);
  const weekdaySum = total - weekend;
  const weekdayAvg = weekdaySum / 5;
  const hasWeekendDrop = total > 0 && weekend < weekdayAvg * 1.4;
  const hasSundayDrop =
    (counts[0] ?? 0) === worstDay && total > 0 && (counts[0] ?? 0) < (bestDay || 1) * 0.5;

  const weekdayText = hasSundayDrop
    ? `Cae los domingos. Mejor: ${bestDayName}.`
    : hasWeekendDrop
      ? `Baja en fines de semana. Mejor: ${bestDayName}.`
      : worstDay === 0 && bestDay > 0
        ? `Mejor: ${bestDayName}. Cae los ${worstDayName}.`
        : `Mejor: ${bestDayName}. Más bajo: ${worstDayName}.`;

  const prefix = selectedRoutine ? '' : 'Vista global: ';
  return `${prefix}Rinde mejor ${bestWindow}. ${weekdayText} ${consistencyText}. ${trendText}.`;
}

export function computeSelectedRoutineKpis(params: {
  selectedRoutineTasks: RoutineTask[];
  selectedRoutineId: string | null;
  taskEvents: RoutineTaskEvent[];
}) {
  const { selectedRoutineTasks, selectedRoutineId, taskEvents } = params;
  const total = selectedRoutineTasks.length;
  const done = selectedRoutineTasks.filter((t) => t.is_done).length;
  const pct = total ? (done / total) * 100 : 0;

  const hasEvents = Array.isArray(taskEvents) && taskEvents.length > 0;
  const windowDays = 14;
  const end = new Date();
  end.setHours(0, 0, 0, 0);

  const days: Date[] = [];
  for (let i = windowDays - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(end.getDate() - i);
    days.push(d);
  }

  const doneCounts = new Map<string, number>();

  if (hasEvents) {
    for (const ev of taskEvents) {
      if (selectedRoutineId && ev.routine_id !== selectedRoutineId) continue;
      if (ev.event_type !== 'completed') continue;
      const d = new Date(ev.created_at);
      const key = dateKeyLocal(d);
      doneCounts.set(key, (doneCounts.get(key) ?? 0) + 1);
    }
  }

  const daily = days.map((d) => {
    const key = dateKeyLocal(d);
    return { key, date: d, count: doneCounts.get(key) ?? 0 };
  });
  const max = daily.reduce((m, x) => Math.max(m, x.count), 0);

  let streak = 0;
  for (let i = daily.length - 1; i >= 0; i--) {
    if (daily[i]!.count > 0) streak++;
    else break;
  }

  let best = 0;
  let run = 0;
  for (const c of daily) {
    if (c.count > 0) {
      run++;
      best = Math.max(best, run);
    } else {
      run = 0;
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
  };
}

export function computeHeatmap(params: {
  allTasks: RoutineTask[];
  taskEvents: RoutineTaskEvent[];
  range: RangeKey;
  weekStartsOn: WeekStartsOn;
}) {
  const { allTasks, taskEvents, range, weekStartsOn } = params;
  const windowDays = windowDaysFromRange(range);
  const end = new Date();
  end.setHours(0, 0, 0, 0);

  const start = new Date(end);
  start.setDate(end.getDate() - (windowDays - 1));
  start.setHours(0, 0, 0, 0);

  // Render a stable week-aligned grid (GitHub-style): always show all boxes,
  // then fill as counts arrive.
  const gridStart = startOfWeekLocal(start, weekStartsOn);
  const gridEnd = endOfWeekLocal(end, weekStartsOn);

  const gridDays: Date[] = [];
  for (let d = new Date(gridStart); d.getTime() <= gridEnd.getTime(); d = addDaysLocal(d, 1)) {
    gridDays.push(d);
  }

  const doneCounts = new Map<string, number>();
  const hasEvents = Array.isArray(taskEvents) && taskEvents.length > 0;

  if (hasEvents) {
    for (const ev of taskEvents) {
      if (ev.event_type !== 'completed') continue;
      const d = new Date(ev.created_at);
      const key = dateKeyLocal(d);
      doneCounts.set(key, (doneCounts.get(key) ?? 0) + 1);
    }
  } else {
    // Fallback: estimate using updated_at on tasks currently marked as done.
    for (const task of allTasks) {
      if (!task.is_done) continue;
      const d = new Date(task.updated_at);
      const key = dateKeyLocal(d);
      doneCounts.set(key, (doneCounts.get(key) ?? 0) + 1);
    }
  }

  const counts = gridDays.map((d) => {
    const key = dateKeyLocal(d);
    const inRange = d.getTime() >= start.getTime() && d.getTime() <= end.getTime();
    return { key, date: d, count: inRange ? (doneCounts.get(key) ?? 0) : 0, inRange };
  });
  const max = counts.reduce((m, x) => (x.inRange ? Math.max(m, x.count) : m), 0);

  // Streak estimate: consecutive days with count > 0.
  let streak = 0;
  for (let i = counts.length - 1; i >= 0; i--) {
    if (counts[i]!.count > 0) streak++;
    else break;
  }

  let best = 0;
  let run = 0;
  for (const c of counts) {
    if (c.count > 0) {
      run++;
      best = Math.max(best, run);
    } else {
      run = 0;
    }
  }

  return { counts, max, streak, best, source: hasEvents ? 'events' : ('estimated' as const) };
}

export function computeStruggleTasks(params: {
  taskEvents: RoutineTaskEvent[];
  selectedRoutineId: string | null;
  range: RangeKey;
  taskTitleById: Map<string, string>;
}) {
  const { taskEvents, selectedRoutineId, range, taskTitleById } = params;
  if (!taskEvents || taskEvents.length === 0)
    return [] as { taskId: string; title: string; score: number; hint: string }[];

  const windowDays = windowDaysFromRange(range);
  const end = startOfDayLocal(new Date());
  const start = new Date(end);
  start.setDate(end.getDate() - (windowDays - 1));

  const map = new Map<
    string,
    {
      completed: number;
      uncompleted: number;
      reopens: number;
      prev: 'completed' | 'uncompleted' | null;
    }
  >();
  const filtered = taskEvents
    .filter((ev) => (!selectedRoutineId ? true : ev.routine_id === selectedRoutineId))
    .filter((ev) => {
      const t = new Date(ev.created_at).getTime();
      return t >= start.getTime() && t < end.getTime() + 1000 * 60 * 60 * 24;
    })
    .slice()
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  for (const ev of filtered) {
    const c = map.get(ev.routine_task_id) ?? {
      completed: 0,
      uncompleted: 0,
      reopens: 0,
      prev: null,
    };
    if (c.prev === 'completed' && ev.event_type === 'uncompleted') c.reopens += 1;
    c.prev = ev.event_type;
    if (ev.event_type === 'completed') c.completed += 1;
    else c.uncompleted += 1;
    map.set(ev.routine_task_id, c);
  }

  return Array.from(map.entries())
    .map(([taskId, c]) => {
      const score = c.uncompleted + c.reopens * 2;
      const title = taskTitleById.get(taskId) ?? 'Tarea';
      const hint =
        c.reopens > 0
          ? 'Sugerencia: divídela en 2 pasos.'
          : 'Sugerencia: reduce la dificultad (hazlo más pequeño).';
      return { taskId, title, score, hint };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);
}
