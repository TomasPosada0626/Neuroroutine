async function freshStore() {
  vi.resetModules();
  vi.clearAllMocks();
  localStorage.clear();
  const mod = await import('../store/dashboardPrefsStore');
  return mod;
}

describe('useDashboardPrefsStore', () => {
  it('setWidgetOrder filters unknown ids and appends missing defaults', async () => {
    const { useDashboardPrefsStore } = await freshStore();

    const initial = useDashboardPrefsStore.getState().widgetOrder;
    expect(initial.length).toBeGreaterThan(0);

    useDashboardPrefsStore
      .getState()
      .setWidgetOrder(['today', 'unknown' as never, 'goal'] as never);
    const next = useDashboardPrefsStore.getState().widgetOrder;

    expect(next[0]).toBe('today');
    expect(next[1]).toBe('goal');
    // Should not contain unknown.
    expect(next.includes('unknown' as never)).toBe(false);
    // Should still contain the default ids.
    for (const id of initial) expect(next).toContain(id);
  });

  it('setWeeklyGoal clamps to a minimum of 1 and persists', async () => {
    const spy = vi.spyOn(window.localStorage.__proto__, 'setItem');
    const { useDashboardPrefsStore } = await freshStore();

    useDashboardPrefsStore.getState().setWeeklyGoal(0);
    expect(useDashboardPrefsStore.getState().weeklyGoal).toBe(1);
    expect(spy).toHaveBeenCalled();
  });

  it('hydrates valid persisted values on startup', async () => {
    localStorage.setItem(
      'nr-dashboard-prefs-v1',
      JSON.stringify({
        scope: 'week',
        weekStartsOn: 0,
        weeklyGoal: 7.8,
        reminderHour: 9,
        widgetOrder: ['goal', 'today', 'unknown'],
        widgetHidden: { goal: true },
        widgetCollapsed: { today: true },
        routineScheduleById: { r1: { daysOfWeek: [1, 3, 5], hour: 7 } },
      }),
    );

    vi.resetModules();
    const { useDashboardPrefsStore } = await import('../store/dashboardPrefsStore');
    const s = useDashboardPrefsStore.getState();

    expect(s.scope).toBe('week');
    expect(s.weekStartsOn).toBe(0);
    expect(s.weeklyGoal).toBe(8);
    expect(s.reminderHour).toBe(9);
    expect(s.widgetOrder[0]).toBe('goal');
    expect(s.widgetOrder).not.toContain('unknown' as never);
    expect(s.widgetHidden.goal).toBe(true);
    expect(s.widgetCollapsed.today).toBe(true);
    expect(s.routineScheduleById.r1?.hour).toBe(7);
  });

  it('toggle methods and moveWidget update state and persist', async () => {
    const spy = vi.spyOn(window.localStorage.__proto__, 'setItem');
    const { useDashboardPrefsStore } = await freshStore();

    useDashboardPrefsStore.getState().toggleWidgetHidden('today');
    expect(useDashboardPrefsStore.getState().widgetHidden.today).toBe(true);

    useDashboardPrefsStore.getState().toggleWidgetCollapsed('today');
    expect(useDashboardPrefsStore.getState().widgetCollapsed.today).toBe(true);

    const before = useDashboardPrefsStore.getState().widgetOrder;
    const idx = before.indexOf('goal');
    expect(idx).toBeGreaterThan(0);

    useDashboardPrefsStore.getState().moveWidget('goal', 'up');
    const afterUp = useDashboardPrefsStore.getState().widgetOrder;
    expect(afterUp[idx - 1]).toBe('goal');

    useDashboardPrefsStore.getState().moveWidget('goal', 'down');
    const afterDown = useDashboardPrefsStore.getState().widgetOrder;
    expect(afterDown[idx]).toBe('goal');

    expect(spy).toHaveBeenCalled();
  });

  it('setters update values and moveWidget ignores edge moves', async () => {
    const { useDashboardPrefsStore } = await freshStore();

    useDashboardPrefsStore.getState().setScope('month');
    useDashboardPrefsStore.getState().setWeekStartsOn(1);
    useDashboardPrefsStore.getState().setReminderHour(null);
    useDashboardPrefsStore.getState().setRoutineSchedule('r2', {
      daysOfWeek: [2, 4],
      hour: 10,
    });

    expect(useDashboardPrefsStore.getState().scope).toBe('month');
    expect(useDashboardPrefsStore.getState().weekStartsOn).toBe(1);
    expect(useDashboardPrefsStore.getState().reminderHour).toBeNull();
    expect(useDashboardPrefsStore.getState().routineScheduleById.r2?.daysOfWeek).toEqual([2, 4]);

    const initial = useDashboardPrefsStore.getState().widgetOrder;
    useDashboardPrefsStore.getState().moveWidget(initial[0]!, 'up');
    useDashboardPrefsStore.getState().moveWidget(initial[initial.length - 1]!, 'down');
    expect(useDashboardPrefsStore.getState().widgetOrder).toEqual(initial);
  });
});
