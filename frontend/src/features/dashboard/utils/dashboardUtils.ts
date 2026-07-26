import type { RoutineTaskEvent } from '@/shared/types/routineEvents';
import type { WeekStartsOn } from '../store/dashboardPrefsStore';

export function dateKeyLocal(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function startOfDayLocal(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDaysLocal(d: Date, deltaDays: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + deltaDays);
  return x;
}

export function startOfWeekLocal(d: Date, weekStartsOn: WeekStartsOn) {
  const x = startOfDayLocal(d);
  const day = x.getDay(); // 0..6
  const diff = weekStartsOn === 1 ? (day + 6) % 7 : day;
  x.setDate(x.getDate() - diff);
  return x;
}

export function endOfWeekLocal(d: Date, weekStartsOn: WeekStartsOn) {
  const start = startOfWeekLocal(d, weekStartsOn);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(0, 0, 0, 0);
  return end;
}

export type RangeKey = '7d' | '28d' | '90d';

export function windowDaysFromRange(range: RangeKey) {
  return range === '7d' ? 7 : range === '28d' ? 28 : 90;
}

export function formatPct(value: number) {
  return `${Math.max(0, Math.min(100, Math.round(value)))}%`;
}

export function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

export function formatHour(h: number) {
  return `${String(h).padStart(2, '0')}:00`;
}

export function formatTimeAgo(iso: string | null) {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  const diff = Date.now() - t;
  const sec = Math.floor(diff / 1000);
  if (sec < 10) return 'justo ahora';
  if (sec < 60) return `hace ${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `hace ${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 48) return `hace ${hr}h`;
  const d = Math.floor(hr / 24);
  return `hace ${d}d`;
}

export function computeDayActivitySet(
  events: RoutineTaskEvent[],
  filter?: { routineId?: string | null },
) {
  const set = new Set<string>();
  for (const ev of events) {
    if (ev.event_type !== 'completed') continue;
    if (filter?.routineId && ev.routine_id !== filter.routineId) continue;
    set.add(dateKeyLocal(new Date(ev.created_at)));
  }
  return set;
}

export function computeStreaks(dayKeys: Set<string>, today = new Date()) {
  const todayKey = dateKeyLocal(today);

  // "Streak freeze": one missed day (today doesn't count as missed — it isn't over yet) is
  // tolerated without zeroing the streak, so a single bad day doesn't erase real progress and
  // demotivate exactly the users this app is meant to help. Two misses in a row still end it.
  let current = dayKeys.has(todayKey) ? 1 : 0;
  let usedGraceDay = false;
  for (let i = 1; i < 3650; i++) {
    const key = dateKeyLocal(addDaysLocal(today, -i));
    if (dayKeys.has(key)) {
      current++;
      continue;
    }
    if (!usedGraceDay) {
      usedGraceDay = true;
      continue;
    }
    break;
  }

  // best streak: iterate sorted keys and count runs
  const sorted = Array.from(dayKeys.values()).sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const key of sorted) {
    if (!prev) {
      run = 1;
      prev = key;
      best = Math.max(best, run);
      continue;
    }

    const prevDate = new Date(prev + 'T00:00:00');
    const nextDate = addDaysLocal(prevDate, 1);
    const expected = dateKeyLocal(nextDate);
    if (key === expected) run++;
    else run = 1;
    prev = key;
    best = Math.max(best, run);
  }

  const hasToday = dayKeys.has(todayKey);
  return { current, best, hasToday, todayKey };
}

export function computeWeekCounts(
  events: RoutineTaskEvent[],
  opts: { weekStartsOn: WeekStartsOn; routineId?: string | null; now?: Date },
) {
  const now = opts.now ?? new Date();
  const startThis = startOfWeekLocal(now, opts.weekStartsOn);
  const startPrev = addDaysLocal(startThis, -7);
  const endThis = addDaysLocal(startThis, 7);

  let thisWeekCompleted = 0;
  let prevWeekCompleted = 0;
  const activeDaysThis = new Set<string>();
  const activeDaysPrev = new Set<string>();

  for (const ev of events) {
    if (ev.event_type !== 'completed') continue;
    if (opts.routineId && ev.routine_id !== opts.routineId) continue;
    const t = new Date(ev.created_at);
    if (t >= startThis && t < endThis) {
      thisWeekCompleted++;
      activeDaysThis.add(dateKeyLocal(t));
    } else if (t >= startPrev && t < startThis) {
      prevWeekCompleted++;
      activeDaysPrev.add(dateKeyLocal(t));
    }
  }

  const consistencyThis = (activeDaysThis.size / 7) * 100;
  const consistencyPrev = (activeDaysPrev.size / 7) * 100;

  const deltaPct =
    prevWeekCompleted === 0
      ? thisWeekCompleted > 0
        ? 100
        : 0
      : ((thisWeekCompleted - prevWeekCompleted) / prevWeekCompleted) * 100;

  return {
    startThis,
    startPrev,
    thisWeekCompleted,
    prevWeekCompleted,
    consistencyThis,
    consistencyPrev,
    deltaPct,
  };
}
