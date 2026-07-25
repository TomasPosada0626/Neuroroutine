import type { Routine, RoutineTask } from '@/features/routines/types';
import type { RoutineTaskEvent } from '@/shared/types/routineEvents';
import {
  buildAchievements,
  buildRiskText,
  buildRoutineTitleById,
  buildSelectedRoutineInsight,
  buildTaskTitleById,
  computeHeatmap,
  computeLastActivity,
  computeNext7Days,
  computeRoutinesRanking,
  computeScheduledRoutinesByDow,
  computeScheduledToday,
  computeSelectedRoutineAnalytics,
  computeSelectedRoutineKpis,
  computeStruggleTasks,
  computeTodayFocus,
  deriveDisplayName,
} from '../utils/dashboardAnalytics';

function routine(id: string, title: string): Routine {
  return {
    id,
    user_id: 'u1',
    title,
    notes: null,
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
  };
}

function task(id: string, routineId: string, overrides: Partial<RoutineTask> = {}): RoutineTask {
  return {
    id,
    user_id: 'u1',
    routine_id: routineId,
    title: `task-${id}`,
    is_done: false,
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

let evSeq = 0;
function event(
  routineId: string,
  taskId: string,
  createdAt: string,
  eventType: 'completed' | 'uncompleted' = 'completed',
): RoutineTaskEvent {
  evSeq += 1;
  return {
    id: `ev-${evSeq}`,
    user_id: 'u1',
    routine_id: routineId,
    routine_task_id: taskId,
    event_type: eventType,
    created_at: createdAt,
  };
}

describe('computeNext7Days', () => {
  it('builds a 7-day window starting today with Spanish weekday labels', () => {
    const now = new Date(2025, 0, 10, 9, 0, 0); // Friday, Jan 10 2025
    const days = computeNext7Days(now);

    expect(days).toHaveLength(7);
    expect(days[0]!.key).toBe('2025-01-10');
    expect(days[0]!.label).toBe('Hoy');
    expect(days[1]!.key).toBe('2025-01-11');
    expect(days[1]!.label).toBe('Sáb 11');
    expect(days[6]!.key).toBe('2025-01-16');
    expect(days[6]!.label).toBe('Jue 16');
  });
});

describe('computeScheduledRoutinesByDow / computeScheduledToday', () => {
  it('groups routines by scheduled day of week and resolves today', () => {
    const routines = [routine('r1', 'Mañana'), routine('r2', 'Noche')];
    const byDow = computeScheduledRoutinesByDow(routines, {
      r1: { daysOfWeek: [1, 3, 5], hour: 7 },
      r2: { daysOfWeek: [1], hour: 21 },
    });

    expect(byDow.get(1)).toEqual(['r1', 'r2']);
    expect(byDow.get(3)).toEqual(['r1']);
    expect(byDow.get(2) ?? []).toEqual([]);

    const today = computeScheduledToday(byDow, routines, 1);
    expect(today.map((r) => r.id)).toEqual(['r1', 'r2']);
  });

  it('ignores routines without a schedule', () => {
    const routines = [routine('r1', 'Mañana')];
    const byDow = computeScheduledRoutinesByDow(routines, {});
    expect(byDow.size).toBe(0);
  });
});

describe('deriveDisplayName', () => {
  it('prefers first_name from user metadata', () => {
    const name = deriveDisplayName({
      email: 'someone@example.com',
      user_metadata: { first_name: 'ana maria' },
    } as never);
    expect(name).toBe('Ana');
  });

  it('falls back to the email local-part when metadata is missing', () => {
    const name = deriveDisplayName({
      email: 'tomas.posada@example.com',
      user_metadata: {},
    } as never);
    expect(name).toBe('Tomas');
  });

  it('returns an empty string when there is nothing to derive from', () => {
    expect(deriveDisplayName(null)).toBe('');
  });
});

describe('buildRoutineTitleById / buildTaskTitleById', () => {
  it('builds id -> title lookup maps', () => {
    const routines = [routine('r1', 'Mañana'), routine('r2', 'Noche')];
    const tasks = [task('t1', 'r1', { title: 'Agua' })];

    expect(buildRoutineTitleById(routines).get('r2')).toBe('Noche');
    expect(buildTaskTitleById(tasks).get('t1')).toBe('Agua');
  });
});

describe('computeTodayFocus', () => {
  it('returns pending tasks sorted by most recently updated, capped at 7', () => {
    const tasks = Array.from({ length: 10 }, (_, i) =>
      task(`t${i}`, 'r1', {
        is_done: i === 0,
        updated_at: new Date(2025, 0, 1 + i).toISOString(),
      }),
    );
    const focus = computeTodayFocus(tasks);
    expect(focus).toHaveLength(7);
    expect(focus[0]!.id).toBe('t9');
    expect(focus.some((t) => t.id === 't0')).toBe(false); // done tasks excluded
  });
});

describe('computeLastActivity', () => {
  it('returns null for an empty task list', () => {
    expect(computeLastActivity([])).toBeNull();
  });

  it('returns the most recently updated task timestamp', () => {
    const tasks = [
      task('t1', 'r1', { updated_at: '2025-01-01T00:00:00.000Z' }),
      task('t2', 'r1', { updated_at: '2025-01-05T00:00:00.000Z' }),
    ];
    expect(computeLastActivity(tasks)?.toISOString()).toBe('2025-01-05T00:00:00.000Z');
  });
});

describe('buildAchievements / buildRiskText', () => {
  it('marks achievements earned based on streaks and weekly goal', () => {
    const achievements = buildAchievements({ current: 3, best: 7, hasToday: true }, 5, 6);
    expect(achievements.find((a) => a.id === 'streak3')?.earned).toBe(true);
    expect(achievements.find((a) => a.id === 'streak7')?.earned).toBe(true);
    expect(achievements.find((a) => a.id === 'goal')?.earned).toBe(true);
  });

  it('produces the right risk copy for each streak state', () => {
    expect(buildRiskText({ current: 0, best: 0, hasToday: false })).toMatch(/Empieza hoy/);
    expect(buildRiskText({ current: 2, best: 2, hasToday: false })).toMatch(/Riesgo/);
    expect(buildRiskText({ current: 2, best: 2, hasToday: true })).toMatch(/Vas bien/);
  });
});

describe('computeSelectedRoutineAnalytics', () => {
  it('returns source "none" and empty series when there are no events', () => {
    const analytics = computeSelectedRoutineAnalytics({
      taskEvents: [],
      selectedRoutineId: 'r1',
      range: '7d',
      taskTitleById: new Map(),
    });
    expect(analytics.source).toBe('none');
    expect(analytics.daySeries).toHaveLength(7);
    expect(analytics.totalCompleted).toBe(0);
  });

  it('aggregates completed/uncompleted events into day buckets and streaks', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 0, 10, 12, 0, 0));

    const events = [
      event('r1', 't1', new Date(2025, 0, 8, 9, 0, 0).toISOString()),
      event('r1', 't1', new Date(2025, 0, 9, 9, 0, 0).toISOString()),
      event('r1', 't1', new Date(2025, 0, 9, 10, 0, 0).toISOString(), 'uncompleted'),
      event('r1', 't2', new Date(2025, 0, 10, 8, 0, 0).toISOString()),
    ];

    const analytics = computeSelectedRoutineAnalytics({
      taskEvents: events,
      selectedRoutineId: 'r1',
      range: '7d',
      taskTitleById: new Map([
        ['t1', 'Agua'],
        ['t2', 'Journaling'],
      ]),
    });

    expect(analytics.source).toBe('events');
    expect(analytics.totalCompleted).toBe(3);
    expect(analytics.totalUncompleted).toBe(1);
    expect(analytics.activeDays).toBe(3); // Jan 8, 9, 10 each have >=1 completion
    expect(analytics.streak).toBe(3); // consecutive days ending today
    expect(analytics.topTasks[0]!.taskId).toBe('t1');
    expect(analytics.topTasks[0]!.reopens).toBe(1); // completed -> uncompleted on t1

    vi.useRealTimers();
  });

  it('only counts events for the selected routine', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 0, 10, 12, 0, 0));

    const events = [
      event('r1', 't1', new Date(2025, 0, 10, 8, 0, 0).toISOString()),
      event('r2', 't2', new Date(2025, 0, 10, 8, 0, 0).toISOString()),
    ];

    const analytics = computeSelectedRoutineAnalytics({
      taskEvents: events,
      selectedRoutineId: 'r1',
      range: '7d',
      taskTitleById: new Map(),
    });

    expect(analytics.totalCompleted).toBe(1);

    vi.useRealTimers();
  });
});

describe('computeRoutinesRanking', () => {
  it('returns an empty list when there is no event history', () => {
    expect(
      computeRoutinesRanking({ taskEvents: [], routines: [routine('r1', 'A')], range: '7d' }),
    ).toEqual([]);
  });

  it('ranks routines by active days then completions within the window', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 0, 10, 12, 0, 0));

    const routines = [routine('r1', 'Mañana'), routine('r2', 'Noche')];
    const events = [
      event('r1', 't1', new Date(2025, 0, 10, 8, 0, 0).toISOString()),
      event('r1', 't1', new Date(2025, 0, 9, 8, 0, 0).toISOString()),
      event('r2', 't2', new Date(2025, 0, 10, 8, 0, 0).toISOString()),
    ];

    const ranking = computeRoutinesRanking({ taskEvents: events, routines, range: '7d' });
    expect(ranking[0]!.id).toBe('r1'); // 2 active days beats r2's 1
    expect(ranking[0]!.completed).toBe(2);

    vi.useRealTimers();
  });
});

describe('buildSelectedRoutineInsight', () => {
  it('falls back to a generic message when there is no event history', () => {
    const analytics = computeSelectedRoutineAnalytics({
      taskEvents: [],
      selectedRoutineId: null,
      range: '7d',
      taskTitleById: new Map(),
    });
    expect(buildSelectedRoutineInsight(null, analytics)).toMatch(/insights globales/);
  });

  it('builds a non-empty insight sentence when there is real history', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 0, 10, 12, 0, 0));

    const events = [event('r1', 't1', new Date(2025, 0, 10, 8, 0, 0).toISOString())];
    const analytics = computeSelectedRoutineAnalytics({
      taskEvents: events,
      selectedRoutineId: 'r1',
      range: '7d',
      taskTitleById: new Map(),
    });

    const insight = buildSelectedRoutineInsight(routine('r1', 'Mañana'), analytics);
    expect(insight.length).toBeGreaterThan(0);
    expect(insight).toMatch(/Rinde mejor/);

    vi.useRealTimers();
  });
});

describe('computeSelectedRoutineKpis', () => {
  it('computes completion percentage for the selected routine tasks', () => {
    const tasks = [task('t1', 'r1', { is_done: true }), task('t2', 'r1', { is_done: false })];
    const kpis = computeSelectedRoutineKpis({
      selectedRoutineTasks: tasks,
      selectedRoutineId: 'r1',
      taskEvents: [],
    });
    expect(kpis.total).toBe(2);
    expect(kpis.done).toBe(1);
    expect(kpis.pct).toBe(50);
    expect(kpis.source).toBe('none');
  });
});

describe('computeHeatmap', () => {
  it('falls back to estimating from task.updated_at when there is no event history', () => {
    const tasks = [task('t1', 'r1', { is_done: true, updated_at: new Date().toISOString() })];
    const heatmap = computeHeatmap({
      allTasks: tasks,
      taskEvents: [],
      range: '7d',
      weekStartsOn: 1,
    });
    expect(heatmap.source).toBe('estimated');
    expect(heatmap.counts.length).toBeGreaterThan(0);
  });

  it('uses real completion events when available', () => {
    const events = [event('r1', 't1', new Date().toISOString())];
    const heatmap = computeHeatmap({
      allTasks: [],
      taskEvents: events,
      range: '7d',
      weekStartsOn: 1,
    });
    expect(heatmap.source).toBe('events');
  });
});

describe('computeStruggleTasks', () => {
  it('scores tasks with reopens higher and suggests splitting them', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 0, 10, 12, 0, 0));

    const events = [
      event('r1', 't1', new Date(2025, 0, 9, 8, 0, 0).toISOString(), 'completed'),
      event('r1', 't1', new Date(2025, 0, 9, 9, 0, 0).toISOString(), 'uncompleted'),
      event('r1', 't2', new Date(2025, 0, 9, 8, 0, 0).toISOString(), 'uncompleted'),
    ];

    const struggles = computeStruggleTasks({
      taskEvents: events,
      selectedRoutineId: 'r1',
      range: '7d',
      taskTitleById: new Map([
        ['t1', 'Agua'],
        ['t2', 'Journaling'],
      ]),
    });

    expect(struggles[0]!.taskId).toBe('t1'); // reopen (score 2) outranks a bare uncompleted (score 1)
    expect(struggles[0]!.hint).toMatch(/divídela/);

    vi.useRealTimers();
  });

  it('returns an empty list when there are no events', () => {
    expect(
      computeStruggleTasks({
        taskEvents: [],
        selectedRoutineId: null,
        range: '7d',
        taskTitleById: new Map(),
      }),
    ).toEqual([]);
  });
});
