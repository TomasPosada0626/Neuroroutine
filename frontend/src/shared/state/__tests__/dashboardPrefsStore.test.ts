async function freshStore() {
  vi.resetModules();
  vi.clearAllMocks();
  localStorage.clear();
  const mod = await import('../dashboardPrefsStore');
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
        widgetOrder: ['goal', 'today', 'unknown'],
        widgetHidden: { goal: true },
        widgetCollapsed: { today: true },
        routineScheduleById: { r1: { daysOfWeek: [1, 3, 5], hour: 7 } },
      }),
    );

    vi.resetModules();
    const { useDashboardPrefsStore } = await import('../dashboardPrefsStore');
    const s = useDashboardPrefsStore.getState();

    expect(s.scope).toBe('week');
    expect(s.weekStartsOn).toBe(0);
    expect(s.weeklyGoal).toBe(8);
    expect(s.widgetOrder[0]).toBe('goal');
    expect(s.widgetOrder).not.toContain('unknown' as never);
    expect(s.widgetHidden.goal).toBe(true);
    expect(s.widgetCollapsed.today).toBe(true);
    expect(s.routineScheduleById.r1?.hour).toBe(7);
  });

  it('falls back to defaults when the persisted value is malformed JSON', async () => {
    localStorage.setItem('nr-dashboard-prefs-v1', '{not valid json');

    vi.resetModules();
    const { useDashboardPrefsStore } = await import('../dashboardPrefsStore');
    const s = useDashboardPrefsStore.getState();

    expect(s.scope).toBe('today');
    expect(s.weeklyGoal).toBe(12);
    expect(s.widgetOrder).toContain('today');
  });

  it('useDashboardPrefs exposes the same store state via a hook', async () => {
    const { renderHook } = await import('@testing-library/react');
    const { useDashboardPrefs, useDashboardPrefsStore } = await freshStore();

    const { result } = renderHook(() => useDashboardPrefs());

    expect(result.current.scope).toBe(useDashboardPrefsStore.getState().scope);
    expect(typeof result.current.setScope).toBe('function');
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
    useDashboardPrefsStore.getState().setRoutineSchedule('r2', {
      daysOfWeek: [2, 4],
      hour: 10,
    });

    expect(useDashboardPrefsStore.getState().scope).toBe('month');
    expect(useDashboardPrefsStore.getState().weekStartsOn).toBe(1);
    expect(useDashboardPrefsStore.getState().routineScheduleById.r2?.daysOfWeek).toEqual([2, 4]);

    const initial = useDashboardPrefsStore.getState().widgetOrder;
    useDashboardPrefsStore.getState().moveWidget(initial[0]!, 'up');
    useDashboardPrefsStore.getState().moveWidget(initial[initial.length - 1]!, 'down');
    expect(useDashboardPrefsStore.getState().widgetOrder).toEqual(initial);
  });

  it('starts with the panel expanded and no favorites by default', async () => {
    const { useDashboardPrefsStore } = await freshStore();

    expect(useDashboardPrefsStore.getState().routinePanelCollapsed).toBe(false);
    expect(useDashboardPrefsStore.getState().favoriteRoutineIds).toEqual([]);
  });

  it('setRoutinePanelCollapsed updates and persists the collapsed flag', async () => {
    const spy = vi.spyOn(window.localStorage.__proto__, 'setItem');
    const { useDashboardPrefsStore } = await freshStore();

    useDashboardPrefsStore.getState().setRoutinePanelCollapsed(true);

    expect(useDashboardPrefsStore.getState().routinePanelCollapsed).toBe(true);
    expect(spy).toHaveBeenCalled();
  });

  it('toggleFavoriteRoutine adds then removes a routine id', async () => {
    const { useDashboardPrefsStore } = await freshStore();

    useDashboardPrefsStore.getState().toggleFavoriteRoutine('r1');
    expect(useDashboardPrefsStore.getState().favoriteRoutineIds).toEqual(['r1']);

    useDashboardPrefsStore.getState().toggleFavoriteRoutine('r1');
    expect(useDashboardPrefsStore.getState().favoriteRoutineIds).toEqual([]);
  });

  it('hydrates routinePanelCollapsed and favoriteRoutineIds from a persisted value', async () => {
    localStorage.setItem(
      'nr-dashboard-prefs-v1',
      JSON.stringify({ routinePanelCollapsed: true, favoriteRoutineIds: ['r1', 'r2'] }),
    );

    vi.resetModules();
    const { useDashboardPrefsStore } = await import('../dashboardPrefsStore');
    const s = useDashboardPrefsStore.getState();

    expect(s.routinePanelCollapsed).toBe(true);
    expect(s.favoriteRoutineIds).toEqual(['r1', 'r2']);
  });
});
