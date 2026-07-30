import { renderHook } from '@testing-library/react';

vi.mock('@/shared/observability/eventLog', () => {
  return {
    logAppEvent: vi.fn(),
  };
});

vi.mock('../routinesService', () => {
  return {
    createRoutine: vi.fn(),
    createTask: vi.fn(),
    deleteRoutine: vi.fn(),
    deleteTask: vi.fn(),
    listAllTasks: vi.fn(),
    listRoutines: vi.fn(),
    listTaskEvents: vi.fn(),
    listTasks: vi.fn(),
    resetRecurringTasks: vi.fn(),
    toggleTaskDone: vi.fn(),
    updateRoutine: vi.fn(),
    updateTask: vi.fn(),
  };
});

vi.mock('@/shared/offline/taskSyncQueue', () => {
  return {
    enqueueTaskInsert: vi.fn(),
    listQueuedTaskInserts: vi.fn(),
    removeQueuedTaskInsert: vi.fn(),
  };
});

async function freshStore() {
  vi.resetModules();
  vi.clearAllMocks();
  localStorage.clear();
  const storeMod = await import('../routinesStore');
  const serviceMod = await import('../routinesService');
  const queueMod = await import('@/shared/offline/taskSyncQueue');
  const eventLogMod = await import('@/shared/observability/eventLog');
  return { storeMod, serviceMod, queueMod, eventLogMod };
}

describe('useRoutinesStore', () => {
  beforeEach(() => {
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      get: () => true,
    });
  });

  it('addRoutine prepends routine and selects it', async () => {
    const { storeMod, serviceMod, eventLogMod } = await freshStore();
    const { useRoutinesStore } = storeMod;

    const existing = {
      id: 'r0',
      user_id: 'u1',
      title: 'Existing',
      notes: null,
      created_at: new Date(2025, 0, 1, 12).toISOString(),
      updated_at: new Date(2025, 0, 1, 12).toISOString(),
    };
    useRoutinesStore.setState({ routines: [existing] });

    const createRoutineMock = vi.mocked(serviceMod.createRoutine);
    createRoutineMock.mockResolvedValue({
      id: 'r1',
      user_id: 'u1',
      title: 'Mi rutina',
      notes: null,
      created_at: new Date(2025, 0, 1, 12).toISOString(),
      updated_at: new Date(2025, 0, 1, 12).toISOString(),
    });

    const created = await useRoutinesStore
      .getState()
      .addRoutine({ user_id: 'u1', title: 'Mi rutina', notes: null });

    const s = useRoutinesStore.getState();
    expect(created.id).toBe('r1');
    expect(s.selectedRoutineId).toBe('r1');
    expect(s.routines.map((r) => r.id)).toEqual(['r1', 'r0']);
    expect(s.loading).toBe(false);
    expect(eventLogMod.logAppEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'u1',
        event_name: 'routine_created',
        routine_id: 'r1',
      }),
    );
  });

  it('useRoutines wrapper returns the same store API and selectRoutine updates selected id', async () => {
    const { storeMod } = await freshStore();
    const { useRoutinesStore, useRoutines } = storeMod;

    const { result } = renderHook(() => useRoutines());
    const api = result.current;
    expect(typeof api.selectRoutine).toBe('function');

    api.selectRoutine('r-xyz');
    expect(useRoutinesStore.getState().selectedRoutineId).toBe('r-xyz');

    api.selectRoutine(null);
    expect(useRoutinesStore.getState().selectedRoutineId).toBeNull();
  });

  it('addTasksBulk skips blank titles and updates task lists', async () => {
    const { storeMod, serviceMod, eventLogMod } = await freshStore();
    const { useRoutinesStore } = storeMod;

    const createTaskMock = vi.mocked(serviceMod.createTask);
    createTaskMock
      .mockResolvedValueOnce({
        id: 't1',
        user_id: 'u1',
        routine_id: 'r1',
        title: 'Tarea 1',
        description: null,
        due_date: null,
        due_time: null,
        is_done: false,
        completed_at: null,
        created_at: new Date(2025, 0, 1, 12).toISOString(),
        updated_at: new Date(2025, 0, 1, 12).toISOString(),
      })
      .mockResolvedValueOnce({
        id: 't2',
        user_id: 'u1',
        routine_id: 'r1',
        title: 'Tarea 2',
        description: 'desc',
        due_date: '2025-01-05',
        due_time: '08:00:00',
        is_done: false,
        completed_at: null,
        created_at: new Date(2025, 0, 1, 12).toISOString(),
        updated_at: new Date(2025, 0, 1, 12).toISOString(),
      });

    await useRoutinesStore.getState().addTasksBulk({
      user_id: 'u1',
      routine_id: 'r1',
      tasks: [
        { title: '  Tarea 1  ' },
        { title: '   ' },
        { title: 'Tarea 2', description: 'desc', due_date: '2025-01-05', due_time: '08:00:00' },
      ],
    });

    const s = useRoutinesStore.getState();

    // allTasks is prepended with reverse() so last created comes first.
    expect(s.allTasks.map((t) => t.id)).toEqual(['t2', 't1']);
    expect((s.tasksByRoutineId['r1'] ?? []).map((t) => t.id)).toEqual(['t1', 't2']);
    expect(s.loading).toBe(false);
    expect(eventLogMod.logAppEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'u1',
        event_name: 'tasks_created_bulk',
        routine_id: 'r1',
        meta: expect.objectContaining({ count: 2 }),
      }),
    );
  });

  it('addRoutine surfaces errors and stores an error message', async () => {
    const { storeMod, serviceMod } = await freshStore();
    const { useRoutinesStore } = storeMod;

    const createRoutineMock = vi.mocked(serviceMod.createRoutine);
    createRoutineMock.mockRejectedValue(new Error('boom'));

    await expect(
      useRoutinesStore.getState().addRoutine({ user_id: 'u1', title: 'Mi rutina' }),
    ).rejects.toThrow('boom');

    expect(useRoutinesStore.getState().error).toBe('boom');
  });

  it('hydrateFromCache restores routines, tasks and selected routine id', async () => {
    const cached = {
      ts: '2026-07-16T10:00:00.000Z',
      selectedRoutineId: 'r1',
      routines: [
        {
          id: 'r1',
          user_id: 'u1',
          title: 'Rutina cache',
          notes: null,
          created_at: new Date(2025, 0, 1, 12).toISOString(),
          updated_at: new Date(2025, 0, 1, 12).toISOString(),
        },
      ],
      allTasks: [
        {
          id: 't1',
          user_id: 'u1',
          routine_id: 'r1',
          title: 'Tarea cache',
          description: null,
          due_date: null,
          due_time: null,
          is_done: false,
          completed_at: null,
          created_at: new Date(2025, 0, 1, 12).toISOString(),
          updated_at: new Date(2025, 0, 1, 12).toISOString(),
        },
      ],
      taskEvents: [],
    };

    localStorage.setItem('nr-cache-routines-v1', JSON.stringify(cached));

    vi.resetModules();
    const { useRoutinesStore } = await import('../routinesStore');

    useRoutinesStore.getState().hydrateFromCache();

    const s = useRoutinesStore.getState();
    expect(s.selectedRoutineId).toBe('r1');
    expect(s.lastSyncedAt).toBe(cached.ts);
    expect(s.routines).toHaveLength(1);
    expect(s.tasksByRoutineId.r1?.[0]?.id).toBe('t1');
  });

  it('hydrateFromCache defaults missing/non-array cache fields to empty instead of throwing', async () => {
    localStorage.setItem(
      'nr-cache-routines-v1',
      JSON.stringify({ routines: 'not-an-array', allTasks: null, taskEvents: 42 }),
    );

    vi.resetModules();
    const { useRoutinesStore } = await import('../routinesStore');

    useRoutinesStore.getState().hydrateFromCache();

    const s = useRoutinesStore.getState();
    expect(s.routines).toEqual([]);
    expect(s.allTasks).toEqual([]);
    expect(s.taskEvents).toEqual([]);
    expect(s.selectedRoutineId).toBeNull();
    expect(s.lastSyncedAt).toBeNull();
  });

  it('hydrateFromCache treats a non-string cached userId as no user, clearing state for a real user', async () => {
    localStorage.setItem(
      'nr-cache-routines-v1',
      JSON.stringify({
        userId: 12345,
        routines: [{ id: 'r1', user_id: 'user-a', title: 'Stale' }],
        allTasks: [],
        taskEvents: [],
      }),
    );

    vi.resetModules();
    const { useRoutinesStore } = await import('../routinesStore');

    useRoutinesStore.getState().hydrateFromCache('user-b');

    const s = useRoutinesStore.getState();
    expect(s.routines).toEqual([]);
    expect(s.selectedRoutineId).toBeNull();
  });

  it('hydrateFromCache is a no-op when there is no cache and no user id was given', async () => {
    localStorage.clear();

    vi.resetModules();
    const { useRoutinesStore } = await import('../routinesStore');
    useRoutinesStore.setState({
      routines: [{ id: 'kept', user_id: 'someone' } as never],
      selectedRoutineId: 'kept',
    });

    useRoutinesStore.getState().hydrateFromCache();

    const s = useRoutinesStore.getState();
    expect(s.routines).toEqual([{ id: 'kept', user_id: 'someone' }]);
    expect(s.selectedRoutineId).toBe('kept');
  });

  it('hydrateFromCache clears state instead of showing stale data when asked for a user with no cache yet', async () => {
    localStorage.clear();

    vi.resetModules();
    const { useRoutinesStore } = await import('../routinesStore');
    // Seed some in-memory state first so we can prove it actually gets cleared, not just
    // left at its already-empty initial value.
    useRoutinesStore.setState({
      routines: [{ id: 'stale', user_id: 'someone-else' } as never],
      selectedRoutineId: 'stale',
    });

    useRoutinesStore.getState().hydrateFromCache('brand-new-user');

    const s = useRoutinesStore.getState();
    expect(s.routines).toEqual([]);
    expect(s.selectedRoutineId).toBeNull();
  });

  it('hydrateFromCache refuses to show user A cached data to user B (cross-account leak guard)', async () => {
    const cached = {
      ts: '2026-07-16T10:00:00.000Z',
      userId: 'user-a',
      selectedRoutineId: 'r1',
      routines: [{ id: 'r1', user_id: 'user-a', title: 'User A routine' }],
      allTasks: [],
      taskEvents: [],
    };
    localStorage.setItem('nr-cache-routines-v1', JSON.stringify(cached));

    vi.resetModules();
    const { useRoutinesStore } = await import('../routinesStore');

    useRoutinesStore.getState().hydrateFromCache('user-b');

    const s = useRoutinesStore.getState();
    expect(s.routines).toEqual([]);
    expect(s.selectedRoutineId).toBeNull();
  });

  it('hydrateFromCache loads normally when the cache belongs to the requesting user', async () => {
    const cached = {
      ts: '2026-07-16T10:00:00.000Z',
      userId: 'user-a',
      selectedRoutineId: 'r1',
      routines: [{ id: 'r1', user_id: 'user-a', title: 'User A routine' }],
      allTasks: [],
      taskEvents: [],
    };
    localStorage.setItem('nr-cache-routines-v1', JSON.stringify(cached));

    vi.resetModules();
    const { useRoutinesStore } = await import('../routinesStore');

    useRoutinesStore.getState().hydrateFromCache('user-a');

    const s = useRoutinesStore.getState();
    expect(s.routines).toHaveLength(1);
    expect(s.selectedRoutineId).toBe('r1');
  });

  it('refreshAll loads lists, groups tasks by routine and clears offline', async () => {
    const { storeMod, serviceMod } = await freshStore();
    const { useRoutinesStore } = storeMod;

    vi.mocked(serviceMod.listRoutines).mockResolvedValue([
      {
        id: 'r1',
        user_id: 'u1',
        title: 'Rutina',
        notes: null,
        created_at: new Date(2025, 0, 1, 12).toISOString(),
        updated_at: new Date(2025, 0, 1, 12).toISOString(),
      },
    ]);
    vi.mocked(serviceMod.listAllTasks).mockResolvedValue([
      {
        id: 't1',
        user_id: 'u1',
        routine_id: 'r1',
        title: 'Task',
        description: null,
        due_date: null,
        due_time: null,
        is_done: false,
        completed_at: null,
        created_at: new Date(2025, 0, 1, 12).toISOString(),
        updated_at: new Date(2025, 0, 1, 12).toISOString(),
      },
    ]);
    vi.mocked(serviceMod.listTaskEvents).mockResolvedValue([]);

    await useRoutinesStore.getState().refreshAll({ since: '2026-07-15T00:00:00.000Z' });

    const s = useRoutinesStore.getState();
    expect(s.loading).toBe(false);
    expect(s.error).toBeNull();
    expect(s.offline).toBe(false);
    expect(s.lastSyncedAt).not.toBeNull();
    expect(s.routines).toHaveLength(1);
    expect(s.tasksByRoutineId.r1?.[0]?.id).toBe('t1');
    expect(localStorage.getItem('nr-cache-routines-v1')).not.toBeNull();
    // Recurring habits must be reset for "today" (browser-local date) before task lists are
    // fetched, so the very first render already shows a fresh checkbox instead of yesterday's.
    expect(serviceMod.resetRecurringTasks).toHaveBeenCalledWith(
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    );
  });

  it('refreshAll caches under the explicit params.userId when provided, ignoring routine/task owners', async () => {
    const { storeMod, serviceMod } = await freshStore();
    const { useRoutinesStore } = storeMod;

    vi.mocked(serviceMod.listRoutines).mockResolvedValue([
      {
        id: 'r1',
        user_id: 'someone-else',
        title: 'Rutina',
        notes: null,
        created_at: new Date(2025, 0, 1, 12).toISOString(),
        updated_at: new Date(2025, 0, 1, 12).toISOString(),
      },
    ]);
    vi.mocked(serviceMod.listAllTasks).mockResolvedValue([]);
    vi.mocked(serviceMod.listTaskEvents).mockResolvedValue([]);

    await useRoutinesStore.getState().refreshAll({ userId: 'explicit-user' });

    const raw = localStorage.getItem('nr-cache-routines-v1');
    expect(raw).not.toBeNull();
    expect((JSON.parse(raw as string) as { userId?: string }).userId).toBe('explicit-user');
  });

  it('refreshAll falls back to the first task owner for the cache when there are no routines, and to null when neither exists', async () => {
    const { storeMod, serviceMod } = await freshStore();
    const { useRoutinesStore } = storeMod;

    vi.mocked(serviceMod.listRoutines).mockResolvedValue([]);
    vi.mocked(serviceMod.listAllTasks).mockResolvedValue([
      {
        id: 't1',
        user_id: 'task-owner',
        routine_id: 'r1',
        title: 'Task',
        description: null,
        due_date: null,
        due_time: null,
        is_done: false,
        completed_at: null,
        created_at: new Date(2025, 0, 1, 12).toISOString(),
        updated_at: new Date(2025, 0, 1, 12).toISOString(),
      },
    ]);
    vi.mocked(serviceMod.listTaskEvents).mockResolvedValue([]);

    await useRoutinesStore.getState().refreshAll();

    const raw = localStorage.getItem('nr-cache-routines-v1');
    expect((JSON.parse(raw as string) as { userId?: string }).userId).toBe('task-owner');

    vi.mocked(serviceMod.listAllTasks).mockResolvedValue([]);
    await useRoutinesStore.getState().refreshAll();
    const raw2 = localStorage.getItem('nr-cache-routines-v1');
    expect((JSON.parse(raw2 as string) as { userId?: string | null }).userId).toBeNull();
  });

  it('refreshAll stores a fallback message for a non-Error failure', async () => {
    const { storeMod, serviceMod } = await freshStore();
    const { useRoutinesStore } = storeMod;

    vi.mocked(serviceMod.listRoutines).mockRejectedValue('x');

    await useRoutinesStore.getState().refreshAll();

    expect(useRoutinesStore.getState().error).toBe('Failed to refresh');
  });

  it('refreshAll leaves offline false on failure when navigator is unavailable', async () => {
    const { storeMod, serviceMod } = await freshStore();
    const { useRoutinesStore } = storeMod;

    vi.stubGlobal('navigator', undefined);
    vi.mocked(serviceMod.listRoutines).mockRejectedValue(new Error('down'));

    await useRoutinesStore.getState().refreshAll();

    expect(useRoutinesStore.getState().offline).toBe(false);
    vi.unstubAllGlobals();
  });

  it('refreshAll stores error and marks offline when service fails', async () => {
    const { storeMod, serviceMod } = await freshStore();
    const { useRoutinesStore } = storeMod;

    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: false,
    });

    vi.mocked(serviceMod.listRoutines).mockRejectedValue(new Error('network down'));

    await useRoutinesStore.getState().refreshAll();

    const s = useRoutinesStore.getState();
    expect(s.loading).toBe(false);
    expect(s.error).toBe('network down');
    expect(s.offline).toBe(true);
  });

  it('loadRoutines clears selectedRoutineId when missing from response', async () => {
    const { storeMod, serviceMod } = await freshStore();
    const { useRoutinesStore } = storeMod;

    useRoutinesStore.setState({ selectedRoutineId: 'gone' });
    vi.mocked(serviceMod.listRoutines).mockResolvedValue([]);

    await useRoutinesStore.getState().loadRoutines();

    const s = useRoutinesStore.getState();
    expect(s.selectedRoutineId).toBeNull();
    expect(s.loading).toBe(false);
  });

  it('setTaskDone updates task entries and appends an optimistic event', async () => {
    const { storeMod, serviceMod, eventLogMod } = await freshStore();
    const { useRoutinesStore } = storeMod;

    const otherTask = {
      id: 't2',
      user_id: 'u1',
      routine_id: 'r1',
      title: 'Untouched',
      description: null,
      due_date: null,
      due_time: null,
      is_done: false,
      completed_at: null,
      created_at: new Date(2025, 0, 1, 12).toISOString(),
      updated_at: new Date(2025, 0, 1, 12).toISOString(),
    };
    useRoutinesStore.setState({
      allTasks: [
        {
          id: 't1',
          user_id: 'u1',
          routine_id: 'r1',
          title: 'Task',
          description: null,
          due_date: null,
          due_time: null,
          is_done: false,
          completed_at: null,
          created_at: new Date(2025, 0, 1, 12).toISOString(),
          updated_at: new Date(2025, 0, 1, 12).toISOString(),
        },
        otherTask,
      ],
      tasksByRoutineId: {
        r1: [
          {
            id: 't1',
            user_id: 'u1',
            routine_id: 'r1',
            title: 'Task',
            description: null,
            due_date: null,
            due_time: null,
            is_done: false,
            completed_at: null,
            created_at: new Date(2025, 0, 1, 12).toISOString(),
            updated_at: new Date(2025, 0, 1, 12).toISOString(),
          },
          otherTask,
        ],
      },
    });

    vi.mocked(serviceMod.toggleTaskDone).mockResolvedValue({
      id: 't1',
      user_id: 'u1',
      routine_id: 'r1',
      title: 'Task',
      description: null,
      due_date: null,
      due_time: null,
      is_done: true,
      completed_at: new Date(2025, 0, 2, 12).toISOString(),
      created_at: new Date(2025, 0, 1, 12).toISOString(),
      updated_at: new Date(2025, 0, 2, 12).toISOString(),
    });

    await useRoutinesStore.getState().setTaskDone({ id: 't1', routine_id: 'r1', is_done: true });

    const s = useRoutinesStore.getState();
    expect(s.allTasks[0]?.is_done).toBe(true);
    expect(s.allTasks[1]).toEqual(otherTask);
    expect(s.tasksByRoutineId.r1?.[0]?.is_done).toBe(true);
    expect(s.tasksByRoutineId.r1?.[1]).toEqual(otherTask);
    expect(s.taskEvents[0]?.event_type).toBe('completed');
    expect(s.loading).toBe(false);
    expect(eventLogMod.logAppEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'u1',
        event_name: 'task_completed',
        routine_id: 'r1',
        routine_task_id: 't1',
      }),
    );
  });

  it('editTask updates the task in both global and per-routine lists', async () => {
    const { storeMod, serviceMod } = await freshStore();
    const { useRoutinesStore } = storeMod;

    const base = {
      id: 't1',
      user_id: 'u1',
      routine_id: 'r1',
      title: 'Old title',
      description: null,
      due_date: null,
      due_time: null,
      is_recurring: false,
      is_done: false,
      completed_at: null,
      created_at: new Date(2025, 0, 1, 12).toISOString(),
      updated_at: new Date(2025, 0, 1, 12).toISOString(),
    };

    const otherTask = { ...base, id: 't2', title: 'Untouched' };

    useRoutinesStore.setState({
      allTasks: [base, otherTask],
      tasksByRoutineId: { r1: [base, otherTask] },
    });

    vi.mocked(serviceMod.updateTask).mockResolvedValue({
      ...base,
      title: 'New title',
      due_date: '2026-08-01',
    });

    await useRoutinesStore.getState().editTask({
      id: 't1',
      routine_id: 'r1',
      title: 'New title',
      due_date: '2026-08-01',
    });

    const s = useRoutinesStore.getState();
    expect(s.allTasks[0]?.title).toBe('New title');
    expect(s.allTasks[1]).toEqual(otherTask);
    expect(s.tasksByRoutineId.r1?.[0]?.due_date).toBe('2026-08-01');
    expect(s.tasksByRoutineId.r1?.[1]).toEqual(otherTask);
    expect(s.error).toBeNull();
    expect(s.loading).toBe(false);
  });

  it('editTask threads recurrence_days_of_week through to the service call', async () => {
    const { storeMod, serviceMod } = await freshStore();
    const { useRoutinesStore } = storeMod;

    const base = {
      id: 't1',
      user_id: 'u1',
      routine_id: 'r1',
      title: 'Gym',
      description: null,
      due_date: null,
      due_time: null,
      is_recurring: true,
      recurrence_days_of_week: null,
      is_done: false,
      completed_at: null,
      created_at: new Date(2025, 0, 1, 12).toISOString(),
      updated_at: new Date(2025, 0, 1, 12).toISOString(),
    };

    useRoutinesStore.setState({
      allTasks: [base],
      tasksByRoutineId: { r1: [base] },
    });

    vi.mocked(serviceMod.updateTask).mockResolvedValue({
      ...base,
      recurrence_days_of_week: [1, 3, 5],
    });

    await useRoutinesStore.getState().editTask({
      id: 't1',
      routine_id: 'r1',
      title: 'Gym',
      is_recurring: true,
      recurrence_days_of_week: [1, 3, 5],
    });

    expect(serviceMod.updateTask).toHaveBeenCalledWith(
      expect.objectContaining({ id: 't1', recurrence_days_of_week: [1, 3, 5] }),
    );

    const s = useRoutinesStore.getState();
    expect(s.allTasks[0]?.recurrence_days_of_week).toEqual([1, 3, 5]);
    expect(s.tasksByRoutineId.r1?.[0]?.recurrence_days_of_week).toEqual([1, 3, 5]);
  });

  it('editTask threads recurrence_days_of_week: null through when clearing weekly cadence', async () => {
    const { storeMod, serviceMod } = await freshStore();
    const { useRoutinesStore } = storeMod;

    const base = {
      id: 't1',
      user_id: 'u1',
      routine_id: 'r1',
      title: 'Gym',
      description: null,
      due_date: null,
      due_time: null,
      is_recurring: true,
      recurrence_days_of_week: [1, 3, 5],
      is_done: false,
      completed_at: null,
      created_at: new Date(2025, 0, 1, 12).toISOString(),
      updated_at: new Date(2025, 0, 1, 12).toISOString(),
    };

    useRoutinesStore.setState({
      allTasks: [base],
      tasksByRoutineId: { r1: [base] },
    });

    vi.mocked(serviceMod.updateTask).mockResolvedValue({
      ...base,
      recurrence_days_of_week: null,
    });

    await useRoutinesStore.getState().editTask({
      id: 't1',
      routine_id: 'r1',
      title: 'Gym',
      is_recurring: true,
      recurrence_days_of_week: null,
    });

    expect(serviceMod.updateTask).toHaveBeenCalledWith(
      expect.objectContaining({ id: 't1', recurrence_days_of_week: null }),
    );
    expect(useRoutinesStore.getState().allTasks[0]?.recurrence_days_of_week).toBeNull();
  });

  it('editTask stores the error message and rethrows so the form can show it', async () => {
    const { storeMod, serviceMod } = await freshStore();
    const { useRoutinesStore } = storeMod;

    vi.mocked(serviceMod.updateTask).mockRejectedValue(new Error('title too long'));

    await expect(
      useRoutinesStore.getState().editTask({ id: 't1', routine_id: 'r1', title: 'x' }),
    ).rejects.toThrow('title too long');
    expect(useRoutinesStore.getState().error).toBe('title too long');
  });

  it('postponeTask moves a one-off task to tomorrow (local date)', async () => {
    const { storeMod, serviceMod } = await freshStore();
    const { useRoutinesStore } = storeMod;

    const base = {
      id: 't1',
      user_id: 'u1',
      routine_id: 'r1',
      title: 'Pay bills',
      description: null,
      due_date: '2026-07-26',
      due_time: '10:00',
      is_recurring: false,
      is_done: false,
      completed_at: null,
      created_at: new Date(2025, 0, 1, 12).toISOString(),
      updated_at: new Date(2025, 0, 1, 12).toISOString(),
    };
    useRoutinesStore.setState({ allTasks: [base], tasksByRoutineId: { r1: [base] } });

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowKey = [
      tomorrow.getFullYear(),
      String(tomorrow.getMonth() + 1).padStart(2, '0'),
      String(tomorrow.getDate()).padStart(2, '0'),
    ].join('-');

    vi.mocked(serviceMod.updateTask).mockResolvedValue({ ...base, due_date: tomorrowKey });

    await useRoutinesStore.getState().postponeTask({ id: 't1', routine_id: 'r1' });

    expect(serviceMod.updateTask).toHaveBeenCalledWith(
      expect.objectContaining({ id: 't1', title: 'Pay bills', due_date: tomorrowKey }),
    );
    const s = useRoutinesStore.getState();
    expect(s.allTasks[0]?.due_date).toBe(tomorrowKey);
    expect(s.loading).toBe(false);
  });

  it('postponeTask is a no-op for a recurring task (no fixed due date to move)', async () => {
    const { storeMod, serviceMod } = await freshStore();
    const { useRoutinesStore } = storeMod;

    const base = {
      id: 't1',
      user_id: 'u1',
      routine_id: 'r1',
      title: 'Daily habit',
      description: null,
      due_date: null,
      due_time: null,
      is_recurring: true,
      is_done: false,
      completed_at: null,
      created_at: new Date(2025, 0, 1, 12).toISOString(),
      updated_at: new Date(2025, 0, 1, 12).toISOString(),
    };
    useRoutinesStore.setState({ allTasks: [base], tasksByRoutineId: { r1: [base] } });

    await useRoutinesStore.getState().postponeTask({ id: 't1', routine_id: 'r1' });

    expect(serviceMod.updateTask).not.toHaveBeenCalled();
  });

  it('removeTask removes task from global and routine lists', async () => {
    const { storeMod, serviceMod, eventLogMod } = await freshStore();
    const { useRoutinesStore } = storeMod;

    const other = {
      id: 't2',
      user_id: 'someone-else',
      routine_id: 'r1',
      title: 'Keep me',
      description: null,
      due_date: null,
      due_time: null,
      is_done: false,
      completed_at: null,
      created_at: new Date(2025, 0, 1, 12).toISOString(),
      updated_at: new Date(2025, 0, 1, 12).toISOString(),
    };
    useRoutinesStore.setState({
      allTasks: [
        other,
        {
          id: 't1',
          user_id: 'u1',
          routine_id: 'r1',
          title: 'Task',
          description: null,
          due_date: null,
          due_time: null,
          is_done: false,
          completed_at: null,
          created_at: new Date(2025, 0, 1, 12).toISOString(),
          updated_at: new Date(2025, 0, 1, 12).toISOString(),
        },
      ],
      tasksByRoutineId: {
        r1: [
          other,
          {
            id: 't1',
            user_id: 'u1',
            routine_id: 'r1',
            title: 'Task',
            description: null,
            due_date: null,
            due_time: null,
            is_done: false,
            completed_at: null,
            created_at: new Date(2025, 0, 1, 12).toISOString(),
            updated_at: new Date(2025, 0, 1, 12).toISOString(),
          },
        ],
      },
    });

    vi.mocked(serviceMod.deleteTask).mockResolvedValue(undefined);

    await useRoutinesStore.getState().removeTask({ id: 't1', routine_id: 'r1' });

    const s = useRoutinesStore.getState();
    expect(s.allTasks).toEqual([other]);
    expect(s.tasksByRoutineId.r1).toEqual([other]);
    expect(s.loading).toBe(false);
    expect(eventLogMod.logAppEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'u1',
        event_name: 'task_deleted',
        routine_id: 'r1',
        routine_task_id: 't1',
      }),
    );
  });

  it('removeTask works even when task user id is not found', async () => {
    const { storeMod, serviceMod } = await freshStore();
    const { useRoutinesStore } = storeMod;

    useRoutinesStore.setState({
      allTasks: [],
      tasksByRoutineId: {
        r1: [
          {
            id: 't1',
            user_id: 'u1',
            routine_id: 'r1',
            title: 'Task',
            description: null,
            due_date: null,
            due_time: null,
            is_done: false,
            completed_at: null,
            created_at: new Date(2025, 0, 1, 12).toISOString(),
            updated_at: new Date(2025, 0, 1, 12).toISOString(),
          },
        ],
      },
    });

    vi.mocked(serviceMod.deleteTask).mockResolvedValue(undefined);

    await useRoutinesStore.getState().removeTask({ id: 't1', routine_id: 'r1' });

    expect(useRoutinesStore.getState().tasksByRoutineId.r1).toEqual([]);
  });

  it('removeTask handles missing routine bucket by using empty fallback array', async () => {
    const { storeMod, serviceMod } = await freshStore();
    const { useRoutinesStore } = storeMod;

    useRoutinesStore.setState({
      allTasks: [
        {
          id: 't_missing_bucket',
          user_id: 'u1',
          routine_id: 'r_missing',
          title: 'Task missing bucket',
          description: null,
          due_date: null,
          due_time: null,
          is_done: false,
          completed_at: null,
          created_at: new Date(2025, 0, 1, 12).toISOString(),
          updated_at: new Date(2025, 0, 1, 12).toISOString(),
        },
      ],
      tasksByRoutineId: {},
    });

    vi.mocked(serviceMod.deleteTask).mockResolvedValue(undefined);

    await useRoutinesStore
      .getState()
      .removeTask({ id: 't_missing_bucket', routine_id: 'r_missing' });

    expect(useRoutinesStore.getState().tasksByRoutineId.r_missing).toEqual([]);
  });

  it('removeRoutine drops selected routine and routine task map entry', async () => {
    const { storeMod, serviceMod, eventLogMod } = await freshStore();
    const { useRoutinesStore } = storeMod;

    const otherRoutine = {
      id: 'r2',
      user_id: 'u1',
      title: 'Keep me',
      notes: null,
      created_at: new Date(2025, 0, 1, 12).toISOString(),
      updated_at: new Date(2025, 0, 1, 12).toISOString(),
    };
    useRoutinesStore.setState({
      selectedRoutineId: 'r1',
      routines: [
        {
          id: 'r1',
          user_id: 'u1',
          title: 'Rutina',
          notes: null,
          created_at: new Date(2025, 0, 1, 12).toISOString(),
          updated_at: new Date(2025, 0, 1, 12).toISOString(),
        },
        otherRoutine,
      ],
      tasksByRoutineId: {
        r1: [],
        r2: [],
      },
    });

    vi.mocked(serviceMod.deleteRoutine).mockResolvedValue(undefined);

    await useRoutinesStore.getState().removeRoutine('r1');

    const s = useRoutinesStore.getState();
    expect(s.routines).toEqual([otherRoutine]);
    expect(s.selectedRoutineId).toBeNull();
    expect(s.tasksByRoutineId.r1).toBeUndefined();
    expect(s.tasksByRoutineId.r2).toEqual([]);
    expect(s.loading).toBe(false);
    expect(eventLogMod.logAppEvent).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'u1', event_name: 'routine_deleted', routine_id: 'r1' }),
    );
  });

  it('removeRoutine removes routine even when user id is not found', async () => {
    const { storeMod, serviceMod } = await freshStore();
    const { useRoutinesStore } = storeMod;

    useRoutinesStore.setState({
      selectedRoutineId: 'r_untouched',
      routines: [
        {
          id: 'r1',
          user_id: 'u1',
          title: 'Rutina',
          notes: null,
          created_at: new Date(2025, 0, 1, 12).toISOString(),
          updated_at: new Date(2025, 0, 1, 12).toISOString(),
        },
      ],
      tasksByRoutineId: {
        r1: [],
      },
    });

    vi.mocked(serviceMod.deleteRoutine).mockResolvedValue(undefined);

    useRoutinesStore.setState({ routines: [] });
    await useRoutinesStore.getState().removeRoutine('r1');

    const s = useRoutinesStore.getState();
    expect(s.routines).toEqual([]);
    expect(s.tasksByRoutineId.r1).toBeUndefined();
    expect(s.selectedRoutineId).toBe('r_untouched');
  });

  it('loadAllTasks and loadTaskEvents update store slices', async () => {
    const { storeMod, serviceMod } = await freshStore();
    const { useRoutinesStore } = storeMod;

    vi.mocked(serviceMod.listAllTasks).mockResolvedValue([
      {
        id: 't1',
        user_id: 'u1',
        routine_id: 'r1',
        title: 'Task',
        description: null,
        due_date: null,
        due_time: null,
        is_done: false,
        completed_at: null,
        created_at: new Date(2025, 0, 1, 12).toISOString(),
        updated_at: new Date(2025, 0, 1, 12).toISOString(),
      },
    ]);
    vi.mocked(serviceMod.listTaskEvents).mockResolvedValue([
      {
        id: 'e1',
        user_id: 'u1',
        routine_id: 'r1',
        routine_task_id: 't1',
        event_type: 'completed',
        created_at: new Date(2025, 0, 2, 12).toISOString(),
      },
    ]);

    await useRoutinesStore.getState().loadAllTasks();
    await useRoutinesStore.getState().loadTaskEvents({ since: '2025-01-01T00:00:00.000Z' });

    const s = useRoutinesStore.getState();
    expect(s.allTasks).toHaveLength(1);
    expect(s.taskEvents).toHaveLength(1);
    expect(s.loading).toBe(false);
  });

  it('loadTasks stores tasks by routine id', async () => {
    const { storeMod, serviceMod } = await freshStore();
    const { useRoutinesStore } = storeMod;

    vi.mocked(serviceMod.listTasks).mockResolvedValue([
      {
        id: 't1',
        user_id: 'u1',
        routine_id: 'r2',
        title: 'Task r2',
        description: null,
        due_date: null,
        due_time: null,
        is_done: false,
        completed_at: null,
        created_at: new Date(2025, 0, 1, 12).toISOString(),
        updated_at: new Date(2025, 0, 1, 12).toISOString(),
      },
    ]);

    await useRoutinesStore.getState().loadTasks('r2');
    const s = useRoutinesStore.getState();
    expect(s.tasksByRoutineId.r2?.[0]?.id).toBe('t1');
    expect(s.loading).toBe(false);
  });

  it('addTask prepends into allTasks and appends into routine bucket', async () => {
    const { storeMod, serviceMod, eventLogMod } = await freshStore();
    const { useRoutinesStore } = storeMod;

    const existing = {
      id: 't0',
      user_id: 'u1',
      routine_id: 'r3',
      title: 'Existing',
      description: null,
      due_date: null,
      due_time: null,
      is_done: false,
      completed_at: null,
      created_at: new Date(2025, 0, 1, 12).toISOString(),
      updated_at: new Date(2025, 0, 1, 12).toISOString(),
    };
    useRoutinesStore.setState({
      allTasks: [existing],
      tasksByRoutineId: { r3: [existing] },
    });

    vi.mocked(serviceMod.createTask).mockResolvedValue({
      id: 't1',
      user_id: 'u1',
      routine_id: 'r3',
      title: 'Task r3',
      description: null,
      due_date: null,
      due_time: null,
      is_done: false,
      completed_at: null,
      created_at: new Date(2025, 0, 1, 12).toISOString(),
      updated_at: new Date(2025, 0, 1, 12).toISOString(),
    });

    await useRoutinesStore
      .getState()
      .addTask({ user_id: 'u1', routine_id: 'r3', title: 'Task r3' });

    const s = useRoutinesStore.getState();
    expect(s.allTasks.map((t) => t.id)).toEqual(['t1', 't0']);
    expect(s.tasksByRoutineId.r3?.map((t) => t.id)).toEqual(['t0', 't1']);
    expect(s.loading).toBe(false);
    expect(eventLogMod.logAppEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'u1',
        event_name: 'task_created',
        routine_id: 'r3',
        routine_task_id: 't1',
      }),
    );
  });

  it('editRoutine updates existing routine entity', async () => {
    const { storeMod, serviceMod } = await freshStore();
    const { useRoutinesStore } = storeMod;

    const other = {
      id: 'r2',
      user_id: 'u1',
      title: 'Untouched',
      notes: null,
      created_at: new Date(2025, 0, 1, 12).toISOString(),
      updated_at: new Date(2025, 0, 1, 12).toISOString(),
    };
    useRoutinesStore.setState({
      routines: [
        {
          id: 'r1',
          user_id: 'u1',
          title: 'Before',
          notes: null,
          created_at: new Date(2025, 0, 1, 12).toISOString(),
          updated_at: new Date(2025, 0, 1, 12).toISOString(),
        },
        other,
      ],
    });

    vi.mocked(serviceMod.updateRoutine).mockResolvedValue({
      id: 'r1',
      user_id: 'u1',
      title: 'After',
      notes: 'Updated',
      created_at: new Date(2025, 0, 1, 12).toISOString(),
      updated_at: new Date(2025, 0, 2, 12).toISOString(),
    });

    await useRoutinesStore.getState().editRoutine({ id: 'r1', title: 'After', notes: 'Updated' });

    const s = useRoutinesStore.getState();
    expect(s.routines[0]?.title).toBe('After');
    expect(s.routines[1]).toEqual(other);
    expect(s.loading).toBe(false);
  });

  it('stores fallback error messages for non-Error throws in task actions', async () => {
    const { storeMod, serviceMod } = await freshStore();
    const { useRoutinesStore } = storeMod;

    vi.mocked(serviceMod.createTask).mockRejectedValue('x');
    await useRoutinesStore
      .getState()
      .addTask({ user_id: 'u1', routine_id: 'r3', title: 'Task r3' });
    expect(useRoutinesStore.getState().error).toBe('Failed to create task');

    vi.mocked(serviceMod.toggleTaskDone).mockRejectedValue('x');
    await useRoutinesStore.getState().setTaskDone({ id: 't1', routine_id: 'r3', is_done: true });
    expect(useRoutinesStore.getState().error).toBe('Failed to update task');

    vi.mocked(serviceMod.deleteTask).mockRejectedValue('x');
    await useRoutinesStore.getState().removeTask({ id: 't1', routine_id: 'r3' });
    expect(useRoutinesStore.getState().error).toBe('Failed to delete task');
  });

  it('hydrates safely when cache is malformed', async () => {
    const { storeMod } = await freshStore();
    const { useRoutinesStore } = storeMod;

    localStorage.setItem('nr-cache-routines-v1', '{broken-json');

    expect(() => useRoutinesStore.getState().hydrateFromCache()).not.toThrow();
    expect(useRoutinesStore.getState().routines).toEqual([]);
  });

  it('loadRoutines keeps selected id when still present', async () => {
    const { storeMod, serviceMod } = await freshStore();
    const { useRoutinesStore } = storeMod;

    useRoutinesStore.setState({ selectedRoutineId: 'r1' });
    vi.mocked(serviceMod.listRoutines).mockResolvedValue([
      {
        id: 'r1',
        user_id: 'u1',
        title: 'Still there',
        notes: null,
        created_at: new Date(2025, 0, 1, 12).toISOString(),
        updated_at: new Date(2025, 0, 1, 12).toISOString(),
      },
    ]);

    await useRoutinesStore.getState().loadRoutines();
    expect(useRoutinesStore.getState().selectedRoutineId).toBe('r1');
  });

  it('uses fallback messages for non-Error failures in loaders', async () => {
    const { storeMod, serviceMod } = await freshStore();
    const { useRoutinesStore } = storeMod;

    vi.mocked(serviceMod.listRoutines).mockRejectedValue('x');
    await useRoutinesStore.getState().loadRoutines();
    expect(useRoutinesStore.getState().error).toBe('Failed to load routines');

    vi.mocked(serviceMod.listAllTasks).mockRejectedValue('x');
    await useRoutinesStore.getState().loadAllTasks();
    expect(useRoutinesStore.getState().error).toBe('Failed to load tasks');

    vi.mocked(serviceMod.listTaskEvents).mockRejectedValue('x');
    await useRoutinesStore.getState().loadTaskEvents();
    expect(useRoutinesStore.getState().error).toBe('Failed to load task events');

    vi.mocked(serviceMod.listTasks).mockRejectedValue('x');
    await useRoutinesStore.getState().loadTasks('r1');
    expect(useRoutinesStore.getState().error).toBe('Failed to load tasks');
  });

  it('addTasksBulk with blank-only titles does not alter lists', async () => {
    const { storeMod } = await freshStore();
    const { useRoutinesStore } = storeMod;

    useRoutinesStore.setState({ allTasks: [], tasksByRoutineId: {} });

    await useRoutinesStore.getState().addTasksBulk({
      user_id: 'u1',
      routine_id: 'r1',
      tasks: [{ title: '   ' }, { title: '' }],
    });

    const s = useRoutinesStore.getState();
    expect(s.allTasks).toEqual([]);
    expect(s.tasksByRoutineId).toEqual({});
  });

  it('stores fallback messages for non-Error failures in routine actions', async () => {
    const { storeMod, serviceMod } = await freshStore();
    const { useRoutinesStore } = storeMod;

    vi.mocked(serviceMod.updateRoutine).mockRejectedValue('x');
    await useRoutinesStore.getState().editRoutine({ id: 'r1', title: 'R1' });
    expect(useRoutinesStore.getState().error).toBe('Failed to update routine');

    vi.mocked(serviceMod.deleteRoutine).mockRejectedValue('x');
    await useRoutinesStore.getState().removeRoutine('r1');
    expect(useRoutinesStore.getState().error).toBe('Failed to delete routine');

    vi.mocked(serviceMod.createTask).mockRejectedValue('x');
    await useRoutinesStore
      .getState()
      .addTasksBulk({ user_id: 'u1', routine_id: 'r1', tasks: [{ title: 'Task one' }] });
    expect(useRoutinesStore.getState().error).toBe('Failed to create tasks');

    vi.mocked(serviceMod.listTaskEvents).mockRejectedValue('x');
    await useRoutinesStore.getState().loadTaskEvents();
    expect(useRoutinesStore.getState().error).toBe('Failed to load task events');

    vi.mocked(serviceMod.deleteTask).mockRejectedValue('x');
    await useRoutinesStore.getState().removeTask({ id: 'task-x', routine_id: 'r1' });
    expect(useRoutinesStore.getState().error).toBe('Failed to delete task');

    vi.mocked(serviceMod.toggleTaskDone).mockRejectedValue('x');
    await useRoutinesStore
      .getState()
      .setTaskDone({ id: 'task-x', routine_id: 'r1', is_done: true });
    expect(useRoutinesStore.getState().error).toBe('Failed to update task');
  });

  it('stores Error.message for Error-instance failures in task actions', async () => {
    const { storeMod, serviceMod } = await freshStore();
    const { useRoutinesStore } = storeMod;

    vi.mocked(serviceMod.listTaskEvents).mockRejectedValue(new Error('events down'));
    await useRoutinesStore.getState().loadTaskEvents();
    expect(useRoutinesStore.getState().error).toBe('events down');

    vi.mocked(serviceMod.toggleTaskDone).mockRejectedValue(new Error('toggle down'));
    await useRoutinesStore
      .getState()
      .setTaskDone({ id: 'task-y', routine_id: 'r1', is_done: false });
    expect(useRoutinesStore.getState().error).toBe('toggle down');

    vi.mocked(serviceMod.deleteTask).mockRejectedValue(new Error('delete down'));
    await useRoutinesStore.getState().removeTask({ id: 'task-y', routine_id: 'r1' });
    expect(useRoutinesStore.getState().error).toBe('delete down');
  });

  it('stores Error.message for Error-instance failures in loaders and remaining routine/task actions', async () => {
    const { storeMod, serviceMod } = await freshStore();
    const { useRoutinesStore } = storeMod;

    vi.mocked(serviceMod.listRoutines).mockRejectedValue(new Error('routines down'));
    await useRoutinesStore.getState().loadRoutines();
    expect(useRoutinesStore.getState().error).toBe('routines down');

    vi.mocked(serviceMod.listAllTasks).mockRejectedValue(new Error('all tasks down'));
    await useRoutinesStore.getState().loadAllTasks();
    expect(useRoutinesStore.getState().error).toBe('all tasks down');

    vi.mocked(serviceMod.listTasks).mockRejectedValue(new Error('tasks down'));
    await useRoutinesStore.getState().loadTasks('r1');
    expect(useRoutinesStore.getState().error).toBe('tasks down');

    vi.mocked(serviceMod.deleteRoutine).mockRejectedValue(new Error('delete routine down'));
    await useRoutinesStore.getState().removeRoutine('r1');
    expect(useRoutinesStore.getState().error).toBe('delete routine down');

    vi.mocked(serviceMod.createTask).mockRejectedValue(new Error('bulk create down'));
    await useRoutinesStore
      .getState()
      .addTasksBulk({ user_id: 'u1', routine_id: 'r1', tasks: [{ title: 'One' }] });
    expect(useRoutinesStore.getState().error).toBe('bulk create down');

    vi.mocked(serviceMod.createTask).mockRejectedValue(new Error('add task down'));
    await useRoutinesStore.getState().addTask({ user_id: 'u1', routine_id: 'r1', title: 'Task' });
    expect(useRoutinesStore.getState().error).toBe('add task down');
  });

  it('stores a fallback message for non-Error failures in addRoutine and editTask', async () => {
    const { storeMod, serviceMod } = await freshStore();
    const { useRoutinesStore } = storeMod;

    vi.mocked(serviceMod.createRoutine).mockRejectedValue('x');
    await expect(
      useRoutinesStore.getState().addRoutine({ user_id: 'u1', title: 'Mi rutina' }),
    ).rejects.toBe('x');
    expect(useRoutinesStore.getState().error).toBe('Failed to create routine');

    vi.mocked(serviceMod.updateTask).mockRejectedValue('x');
    await expect(
      useRoutinesStore.getState().editTask({ id: 't1', routine_id: 'r1', title: 'x' }),
    ).rejects.toBe('x');
    expect(useRoutinesStore.getState().error).toBe('Failed to update task');

    vi.mocked(serviceMod.updateRoutine).mockRejectedValue(new Error('title too long'));
    await useRoutinesStore.getState().editRoutine({ id: 'r1', title: 'x' });
    expect(useRoutinesStore.getState().error).toBe('title too long');
  });

  it('addTasksBulk offline with blank-only titles keeps offline flag unchanged', async () => {
    const { storeMod } = await freshStore();
    const { useRoutinesStore } = storeMod;

    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: false,
    });

    useRoutinesStore.setState({ offline: false });

    await useRoutinesStore.getState().addTasksBulk({
      user_id: 'u1',
      routine_id: 'r1',
      tasks: [{ title: '   ' }, { title: '' }],
    });

    expect(useRoutinesStore.getState().offline).toBe(false);
  });

  it('setTaskDone supports uncompleted event type branch', async () => {
    const { storeMod, serviceMod, eventLogMod } = await freshStore();
    const { useRoutinesStore } = storeMod;

    useRoutinesStore.setState({
      allTasks: [
        {
          id: 't2',
          user_id: 'u1',
          routine_id: 'r1',
          title: 'Task 2',
          description: null,
          due_date: null,
          due_time: null,
          is_done: true,
          completed_at: new Date(2025, 0, 2, 12).toISOString(),
          created_at: new Date(2025, 0, 1, 12).toISOString(),
          updated_at: new Date(2025, 0, 2, 12).toISOString(),
        },
      ],
      tasksByRoutineId: {
        r1: [
          {
            id: 't2',
            user_id: 'u1',
            routine_id: 'r1',
            title: 'Task 2',
            description: null,
            due_date: null,
            due_time: null,
            is_done: true,
            completed_at: new Date(2025, 0, 2, 12).toISOString(),
            created_at: new Date(2025, 0, 1, 12).toISOString(),
            updated_at: new Date(2025, 0, 2, 12).toISOString(),
          },
        ],
      },
    });

    vi.mocked(serviceMod.toggleTaskDone).mockResolvedValue({
      id: 't2',
      user_id: 'u1',
      routine_id: 'r1',
      title: 'Task 2',
      description: null,
      due_date: null,
      due_time: null,
      is_done: false,
      completed_at: null,
      created_at: new Date(2025, 0, 1, 12).toISOString(),
      updated_at: new Date(2025, 0, 3, 12).toISOString(),
    });

    await useRoutinesStore.getState().setTaskDone({ id: 't2', routine_id: 'r1', is_done: false });
    expect(useRoutinesStore.getState().taskEvents[0]?.event_type).toBe('uncompleted');
    expect(eventLogMod.logAppEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event_name: 'task_uncompleted' }),
    );
  });

  it('setTaskDone initializes the routine bucket when none existed yet', async () => {
    const { storeMod, serviceMod } = await freshStore();
    const { useRoutinesStore } = storeMod;

    useRoutinesStore.setState({ allTasks: [], tasksByRoutineId: {} });
    vi.mocked(serviceMod.toggleTaskDone).mockResolvedValue({
      id: 't9',
      user_id: 'u1',
      routine_id: 'r9',
      title: 'Task',
      description: null,
      due_date: null,
      due_time: null,
      is_done: true,
      completed_at: new Date(2025, 0, 2, 12).toISOString(),
      created_at: new Date(2025, 0, 1, 12).toISOString(),
      updated_at: new Date(2025, 0, 2, 12).toISOString(),
    });

    await useRoutinesStore.getState().setTaskDone({ id: 't9', routine_id: 'r9', is_done: true });

    expect(useRoutinesStore.getState().tasksByRoutineId.r9).toEqual([]);
  });

  it('setTaskDone falls back to a Date-based id when crypto.randomUUID is unavailable', async () => {
    const { storeMod, serviceMod } = await freshStore();
    const { useRoutinesStore } = storeMod;

    vi.stubGlobal('crypto', {});
    vi.mocked(serviceMod.toggleTaskDone).mockResolvedValue({
      id: 't10',
      user_id: 'u1',
      routine_id: 'r1',
      title: 'Task',
      description: null,
      due_date: null,
      due_time: null,
      is_done: true,
      completed_at: new Date(2025, 0, 2, 12).toISOString(),
      created_at: new Date(2025, 0, 1, 12).toISOString(),
      updated_at: new Date(2025, 0, 2, 12).toISOString(),
    });

    await useRoutinesStore.getState().setTaskDone({ id: 't10', routine_id: 'r1', is_done: true });

    expect(useRoutinesStore.getState().taskEvents[0]?.id).toMatch(/^local_\d+$/);
    vi.unstubAllGlobals();
  });

  it('editTask initializes the routine bucket when none existed yet', async () => {
    const { storeMod, serviceMod } = await freshStore();
    const { useRoutinesStore } = storeMod;

    useRoutinesStore.setState({ allTasks: [], tasksByRoutineId: {} });
    vi.mocked(serviceMod.updateTask).mockResolvedValue({
      id: 't11',
      user_id: 'u1',
      routine_id: 'r11',
      title: 'Renamed',
      description: null,
      due_date: null,
      due_time: null,
      is_recurring: false,
      is_done: false,
      completed_at: null,
      created_at: new Date(2025, 0, 1, 12).toISOString(),
      updated_at: new Date(2025, 0, 1, 12).toISOString(),
    });

    await useRoutinesStore.getState().editTask({ id: 't11', routine_id: 'r11', title: 'Renamed' });

    expect(useRoutinesStore.getState().tasksByRoutineId.r11).toEqual([]);
  });

  it('postponeTask passes through a null due_time unchanged', async () => {
    const { storeMod, serviceMod } = await freshStore();
    const { useRoutinesStore } = storeMod;

    const base = {
      id: 't12',
      user_id: 'u1',
      routine_id: 'r1',
      title: 'No time set',
      description: null,
      due_date: '2026-07-26',
      due_time: null,
      is_recurring: false,
      is_done: false,
      completed_at: null,
      created_at: new Date(2025, 0, 1, 12).toISOString(),
      updated_at: new Date(2025, 0, 1, 12).toISOString(),
    };
    useRoutinesStore.setState({ allTasks: [base], tasksByRoutineId: { r1: [base] } });
    vi.mocked(serviceMod.updateTask).mockResolvedValue({ ...base, due_date: '2026-07-27' });

    await useRoutinesStore.getState().postponeTask({ id: 't12', routine_id: 'r1' });

    expect(serviceMod.updateTask).toHaveBeenCalledWith(expect.objectContaining({ due_time: null }));
  });

  it('addTasksBulk treats a stubbed-out navigator as online', async () => {
    const { storeMod, serviceMod } = await freshStore();
    const { useRoutinesStore } = storeMod;

    vi.stubGlobal('navigator', undefined);
    vi.mocked(serviceMod.createTask).mockResolvedValue({
      id: 't-bulk-no-nav',
      user_id: 'u1',
      routine_id: 'r1',
      title: 'One',
      description: null,
      due_date: null,
      due_time: null,
      is_done: false,
      completed_at: null,
      created_at: new Date(2025, 0, 1, 12).toISOString(),
      updated_at: new Date(2025, 0, 1, 12).toISOString(),
    });

    await useRoutinesStore
      .getState()
      .addTasksBulk({ user_id: 'u1', routine_id: 'r1', tasks: [{ title: 'One' }] });

    expect(serviceMod.createTask).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('syncOfflineTasks returns 0 and marks offline when navigator is offline', async () => {
    const { storeMod, queueMod } = await freshStore();
    const { useRoutinesStore } = storeMod;

    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: false,
    });

    const synced = await useRoutinesStore.getState().syncOfflineTasks();

    expect(synced).toBe(0);
    expect(useRoutinesStore.getState().offline).toBe(true);
    expect(vi.mocked(queueMod.listQueuedTaskInserts)).not.toHaveBeenCalled();
  });

  it('syncOfflineTasks returns 0 and clears offline when no pending items exist', async () => {
    const { storeMod, queueMod } = await freshStore();
    const { useRoutinesStore } = storeMod;

    vi.mocked(queueMod.listQueuedTaskInserts).mockResolvedValue([]);
    useRoutinesStore.setState({ offline: true });

    const synced = await useRoutinesStore.getState().syncOfflineTasks();

    expect(synced).toBe(0);
    expect(useRoutinesStore.getState().offline).toBe(false);
  });

  it('syncOfflineTasks replaces local tasks and removes queue entries on success', async () => {
    const { storeMod, serviceMod, queueMod, eventLogMod } = await freshStore();
    const { useRoutinesStore } = storeMod;

    const pending = [
      {
        local_id: 'local_1',
        user_id: 'u1',
        routine_id: 'r1',
        title: 'Offline task',
        description: null,
        due_date: null,
        due_time: null,
        queued_at: '2026-07-18T10:00:00.000Z',
      },
    ];

    vi.mocked(queueMod.listQueuedTaskInserts).mockResolvedValue(pending);
    vi.mocked(queueMod.removeQueuedTaskInsert).mockResolvedValue(undefined);
    vi.mocked(serviceMod.createTask).mockResolvedValue({
      id: 'remote_1',
      user_id: 'u1',
      routine_id: 'r1',
      title: 'Offline task',
      description: null,
      due_date: null,
      due_time: null,
      is_done: false,
      completed_at: null,
      created_at: new Date(2026, 6, 18, 10).toISOString(),
      updated_at: new Date(2026, 6, 18, 10).toISOString(),
    });

    const otherTask = {
      id: 'unrelated',
      user_id: 'u1',
      routine_id: 'r1',
      title: 'Already synced',
      description: null,
      due_date: null,
      due_time: null,
      is_done: false,
      completed_at: null,
      created_at: new Date(2026, 6, 18, 10).toISOString(),
      updated_at: new Date(2026, 6, 18, 10).toISOString(),
    };
    useRoutinesStore.setState({
      allTasks: [
        {
          id: 'local_1',
          user_id: 'u1',
          routine_id: 'r1',
          title: 'Offline task',
          description: null,
          due_date: null,
          due_time: null,
          is_done: false,
          completed_at: null,
          created_at: new Date(2026, 6, 18, 10).toISOString(),
          updated_at: new Date(2026, 6, 18, 10).toISOString(),
        },
        otherTask,
      ],
      tasksByRoutineId: {
        r1: [
          {
            id: 'local_1',
            user_id: 'u1',
            routine_id: 'r1',
            title: 'Offline task',
            description: null,
            due_date: null,
            due_time: null,
            is_done: false,
            completed_at: null,
            created_at: new Date(2026, 6, 18, 10).toISOString(),
            updated_at: new Date(2026, 6, 18, 10).toISOString(),
          },
          otherTask,
        ],
      },
    });

    const synced = await useRoutinesStore.getState().syncOfflineTasks();
    const s = useRoutinesStore.getState();

    expect(synced).toBe(1);
    expect(s.offline).toBe(false);
    expect(s.lastSyncedAt).not.toBeNull();
    expect(s.allTasks.find((t) => t.id === 'remote_1')).toBeTruthy();
    expect(s.allTasks.find((t) => t.id === 'unrelated')).toEqual(otherTask);
    expect(s.tasksByRoutineId.r1?.find((t) => t.id === 'remote_1')).toBeTruthy();
    expect(s.tasksByRoutineId.r1?.find((t) => t.id === 'unrelated')).toEqual(otherTask);
    expect(vi.mocked(queueMod.removeQueuedTaskInsert)).toHaveBeenCalledWith('local_1');
    expect(eventLogMod.logAppEvent).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'u1', event_name: 'offline_sync_completed' }),
    );
  });

  it('syncOfflineTasks initializes the routine bucket when none existed yet', async () => {
    const { storeMod, serviceMod, queueMod } = await freshStore();
    const { useRoutinesStore } = storeMod;

    vi.mocked(queueMod.listQueuedTaskInserts).mockResolvedValue([
      {
        local_id: 'local_3',
        user_id: 'u1',
        routine_id: 'r-no-bucket',
        title: 'No bucket yet',
        description: null,
        due_date: null,
        due_time: null,
        queued_at: '2026-07-18T10:00:00.000Z',
      },
    ]);
    vi.mocked(queueMod.removeQueuedTaskInsert).mockResolvedValue(undefined);
    vi.mocked(serviceMod.createTask).mockResolvedValue({
      id: 'remote_3',
      user_id: 'u1',
      routine_id: 'r-no-bucket',
      title: 'No bucket yet',
      description: null,
      due_date: null,
      due_time: null,
      is_done: false,
      completed_at: null,
      created_at: new Date(2026, 6, 18, 10).toISOString(),
      updated_at: new Date(2026, 6, 18, 10).toISOString(),
    });
    useRoutinesStore.setState({ allTasks: [], tasksByRoutineId: {} });

    await useRoutinesStore.getState().syncOfflineTasks();

    expect(useRoutinesStore.getState().tasksByRoutineId['r-no-bucket']).toEqual([]);
  });

  it('syncOfflineTasks skips the completion event when the first pending item has no user id', async () => {
    const { storeMod, serviceMod, queueMod } = await freshStore();
    const { useRoutinesStore } = storeMod;

    vi.mocked(queueMod.listQueuedTaskInserts).mockResolvedValue([
      {
        local_id: 'local_4',
        user_id: '',
        routine_id: 'r1',
        title: 'No user id',
        description: null,
        due_date: null,
        due_time: null,
        queued_at: '2026-07-18T10:00:00.000Z',
      },
    ]);
    vi.mocked(queueMod.removeQueuedTaskInsert).mockResolvedValue(undefined);
    vi.mocked(serviceMod.createTask).mockResolvedValue({
      id: 'remote_4',
      user_id: '',
      routine_id: 'r1',
      title: 'No user id',
      description: null,
      due_date: null,
      due_time: null,
      is_done: false,
      completed_at: null,
      created_at: new Date(2026, 6, 18, 10).toISOString(),
      updated_at: new Date(2026, 6, 18, 10).toISOString(),
    });

    const synced = await useRoutinesStore.getState().syncOfflineTasks();

    expect(synced).toBe(1);
  });

  it('syncOfflineTasks treats a stubbed-out navigator as online', async () => {
    const { storeMod, queueMod } = await freshStore();
    const { useRoutinesStore } = storeMod;

    vi.stubGlobal('navigator', undefined);
    vi.mocked(queueMod.listQueuedTaskInserts).mockResolvedValue([]);

    const synced = await useRoutinesStore.getState().syncOfflineTasks();

    expect(synced).toBe(0);
    expect(useRoutinesStore.getState().offline).toBe(false);
    vi.unstubAllGlobals();
  });

  it('syncOfflineTasks keeps queue item and marks offline on a real network failure', async () => {
    const { storeMod, serviceMod, queueMod } = await freshStore();
    const { useRoutinesStore } = storeMod;

    vi.mocked(queueMod.listQueuedTaskInserts).mockResolvedValue([
      {
        local_id: 'local_2',
        user_id: 'u1',
        routine_id: 'r1',
        title: 'Will fail',
        description: null,
        due_date: null,
        due_time: null,
        queued_at: '2026-07-18T10:00:00.000Z',
      },
    ]);
    // Browsers throw a bare TypeError for a failed fetch (offline/DNS/CORS) — this is the one
    // failure shape that should just retry silently rather than nag the user about it.
    vi.mocked(serviceMod.createTask).mockRejectedValue(new TypeError('Failed to fetch'));

    const synced = await useRoutinesStore.getState().syncOfflineTasks();
    const s = useRoutinesStore.getState();

    expect(synced).toBe(0);
    expect(s.offline).toBe(true);
    expect(s.offlineSyncIssues).toEqual([]);
    expect(vi.mocked(queueMod.removeQueuedTaskInsert)).not.toHaveBeenCalled();
  });

  it('syncOfflineTasks surfaces a specific, actionable issue for a non-network failure', async () => {
    const { storeMod, serviceMod, queueMod } = await freshStore();
    const { useRoutinesStore } = storeMod;

    vi.mocked(queueMod.listQueuedTaskInserts).mockResolvedValue([
      {
        local_id: 'local_3',
        user_id: 'u1',
        routine_id: 'deleted-routine',
        title: 'Orphaned task',
        description: null,
        due_date: null,
        due_time: null,
        queued_at: '2026-07-18T10:00:00.000Z',
      },
    ]);
    const fkError = Object.assign(new Error('violates foreign key constraint'), {
      code: '23503',
    });
    vi.mocked(serviceMod.createTask).mockRejectedValue(fkError);

    const synced = await useRoutinesStore.getState().syncOfflineTasks();
    const s = useRoutinesStore.getState();

    expect(synced).toBe(0);
    // We're still online — this task specifically can't be created, retrying won't help.
    expect(s.offline).toBe(false);
    expect(s.offlineSyncIssues).toEqual([
      {
        localId: 'local_3',
        title: 'Orphaned task',
        message: 'La rutina de esta tarea ya no existe.',
      },
    ]);
    expect(vi.mocked(queueMod.removeQueuedTaskInsert)).not.toHaveBeenCalled();
  });

  it('syncOfflineTasks surfaces the raw error message for a non-FK Error failure', async () => {
    const { storeMod, serviceMod, queueMod } = await freshStore();
    const { useRoutinesStore } = storeMod;

    vi.mocked(queueMod.listQueuedTaskInserts).mockResolvedValue([
      {
        local_id: 'local_4',
        user_id: 'u1',
        routine_id: 'r1',
        title: 'Bad task',
        description: null,
        due_date: null,
        due_time: null,
        queued_at: '2026-07-18T10:00:00.000Z',
      },
    ]);
    vi.mocked(serviceMod.createTask).mockRejectedValue(new Error('title too long'));

    await useRoutinesStore.getState().syncOfflineTasks();

    expect(useRoutinesStore.getState().offlineSyncIssues).toEqual([
      { localId: 'local_4', title: 'Bad task', message: 'title too long' },
    ]);
  });

  it('syncOfflineTasks falls back to a generic message for a non-Error thrown value', async () => {
    const { storeMod, serviceMod, queueMod } = await freshStore();
    const { useRoutinesStore } = storeMod;

    vi.mocked(queueMod.listQueuedTaskInserts).mockResolvedValue([
      {
        local_id: 'local_5',
        user_id: 'u1',
        routine_id: 'r1',
        title: 'Weird failure',
        description: null,
        due_date: null,
        due_time: null,
        queued_at: '2026-07-18T10:00:00.000Z',
      },
    ]);
    vi.mocked(serviceMod.createTask).mockRejectedValue('not an Error instance');

    await useRoutinesStore.getState().syncOfflineTasks();

    expect(useRoutinesStore.getState().offlineSyncIssues).toEqual([
      { localId: 'local_5', title: 'Weird failure', message: 'No se pudo sincronizar esta tarea.' },
    ]);
  });

  it('discardOfflineTask removes the queue entry and the local placeholder task', async () => {
    const { storeMod, queueMod } = await freshStore();
    const { useRoutinesStore } = storeMod;

    useRoutinesStore.setState({
      offlineSyncIssues: [
        { localId: 'stuck-1', title: 'Orphaned task', message: 'La rutina ya no existe.' },
      ],
      allTasks: [
        {
          id: 'stuck-1',
          user_id: 'u1',
          routine_id: 'r1',
          title: 'Orphaned task',
          is_done: false,
          created_at: '2026-07-18T10:00:00.000Z',
          updated_at: '2026-07-18T10:00:00.000Z',
        } as never,
      ],
      tasksByRoutineId: {
        r1: [
          {
            id: 'stuck-1',
            user_id: 'u1',
            routine_id: 'r1',
            title: 'Orphaned task',
            is_done: false,
            created_at: '2026-07-18T10:00:00.000Z',
            updated_at: '2026-07-18T10:00:00.000Z',
          } as never,
        ],
      },
    });

    await useRoutinesStore.getState().discardOfflineTask('stuck-1');

    expect(vi.mocked(queueMod.removeQueuedTaskInsert)).toHaveBeenCalledWith('stuck-1');
    const s = useRoutinesStore.getState();
    expect(s.offlineSyncIssues).toEqual([]);
    expect(s.allTasks).toEqual([]);
    expect(s.tasksByRoutineId.r1).toEqual([]);
  });

  it('addTask offline enqueues local task and marks store offline', async () => {
    const { storeMod, queueMod } = await freshStore();
    const { useRoutinesStore } = storeMod;

    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: false,
    });

    await useRoutinesStore
      .getState()
      .addTask({ user_id: 'u1', routine_id: 'r5', title: 'Offline local task', description: 'd' });

    const s = useRoutinesStore.getState();
    expect(s.offline).toBe(true);
    expect(s.allTasks).toHaveLength(1);
    expect(s.tasksByRoutineId.r5).toHaveLength(1);
    expect(s.allTasks[0]?.due_date).toBeNull();
    expect(vi.mocked(queueMod.enqueueTaskInsert)).toHaveBeenCalledTimes(1);
  });

  it('addTask offline keeps a provided due_date and due_time instead of nulling them', async () => {
    const { storeMod } = await freshStore();
    const { useRoutinesStore } = storeMod;

    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: false,
    });

    await useRoutinesStore.getState().addTask({
      user_id: 'u1',
      routine_id: 'r5',
      title: 'Offline with date',
      due_date: '2026-08-01',
      due_time: '09:00',
    });

    const s = useRoutinesStore.getState();
    expect(s.allTasks[0]?.due_date).toBe('2026-08-01');
    expect(s.allTasks[0]?.due_time).toBe('09:00');
  });

  it('addTask treats a stubbed-out navigator as online', async () => {
    const { storeMod, serviceMod } = await freshStore();
    const { useRoutinesStore } = storeMod;

    vi.stubGlobal('navigator', undefined);
    vi.mocked(serviceMod.createTask).mockResolvedValue({
      id: 't-no-nav',
      user_id: 'u1',
      routine_id: 'r1',
      title: 'Task',
      description: null,
      due_date: null,
      due_time: null,
      is_done: false,
      completed_at: null,
      created_at: new Date(2025, 0, 1, 12).toISOString(),
      updated_at: new Date(2025, 0, 1, 12).toISOString(),
    });

    await useRoutinesStore.getState().addTask({ user_id: 'u1', routine_id: 'r1', title: 'Task' });

    expect(serviceMod.createTask).toHaveBeenCalled();
    expect(useRoutinesStore.getState().allTasks[0]?.id).toBe('t-no-nav');
    vi.unstubAllGlobals();
  });

  it('addTask creates a fresh routine bucket when none existed yet', async () => {
    const { storeMod, serviceMod } = await freshStore();
    const { useRoutinesStore } = storeMod;

    useRoutinesStore.setState({ tasksByRoutineId: {} });
    vi.mocked(serviceMod.createTask).mockResolvedValue({
      id: 't-fresh',
      user_id: 'u1',
      routine_id: 'r-fresh',
      title: 'Task',
      description: null,
      due_date: null,
      due_time: null,
      is_done: false,
      completed_at: null,
      created_at: new Date(2025, 0, 1, 12).toISOString(),
      updated_at: new Date(2025, 0, 1, 12).toISOString(),
    });

    await useRoutinesStore
      .getState()
      .addTask({ user_id: 'u1', routine_id: 'r-fresh', title: 'Task' });

    expect(useRoutinesStore.getState().tasksByRoutineId['r-fresh']).toHaveLength(1);
  });

  it('addTasksBulk offline queues local tasks and sets offline state', async () => {
    const { storeMod, queueMod } = await freshStore();
    const { useRoutinesStore } = storeMod;

    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: false,
    });

    await useRoutinesStore.getState().addTasksBulk({
      user_id: 'u1',
      routine_id: 'r6',
      tasks: [
        { title: '  offline 1  ' },
        { title: '  ' },
        { title: 'offline 2', description: 'desc' },
      ],
    });

    const s = useRoutinesStore.getState();
    expect(s.offline).toBe(true);
    expect(s.tasksByRoutineId.r6).toHaveLength(2);
    expect(vi.mocked(queueMod.enqueueTaskInsert)).toHaveBeenCalledTimes(2);
  });
});
