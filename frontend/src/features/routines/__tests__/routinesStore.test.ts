import { describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/observability/eventLog', () => {
  return {
    logAppEvent: vi.fn(),
  }
})

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
    toggleTaskDone: vi.fn(),
    updateRoutine: vi.fn(),
  }
})

async function freshStore() {
  vi.resetModules()
  vi.clearAllMocks()
  localStorage.clear()
  const storeMod = await import('../routinesStore')
  const serviceMod = await import('../routinesService')
  return { storeMod, serviceMod }
}

describe('useRoutinesStore', () => {
  it('addRoutine prepends routine and selects it', async () => {
    const { storeMod, serviceMod } = await freshStore()
    const { useRoutinesStore } = storeMod

    const createRoutineMock = vi.mocked(serviceMod.createRoutine)
    createRoutineMock.mockResolvedValue({
      id: 'r1',
      user_id: 'u1',
      title: 'Mi rutina',
      notes: null,
      created_at: new Date(2025, 0, 1, 12).toISOString(),
      updated_at: new Date(2025, 0, 1, 12).toISOString(),
    })

    const created = await useRoutinesStore
      .getState()
      .addRoutine({ user_id: 'u1', title: 'Mi rutina', notes: null })

    const s = useRoutinesStore.getState()
    expect(created.id).toBe('r1')
    expect(s.selectedRoutineId).toBe('r1')
    expect(s.routines[0]?.id).toBe('r1')
  })

  it('addTasksBulk skips blank titles and updates task lists', async () => {
    const { storeMod, serviceMod } = await freshStore()
    const { useRoutinesStore } = storeMod

    const createTaskMock = vi.mocked(serviceMod.createTask)
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
      })

    await useRoutinesStore.getState().addTasksBulk({
      user_id: 'u1',
      routine_id: 'r1',
      tasks: [
        { title: '  Tarea 1  ' },
        { title: '   ' },
        { title: 'Tarea 2', description: 'desc', due_date: '2025-01-05', due_time: '08:00:00' },
      ],
    })

    const s = useRoutinesStore.getState()

    // allTasks is prepended with reverse() so last created comes first.
    expect(s.allTasks.map((t) => t.id)).toEqual(['t2', 't1'])
    expect((s.tasksByRoutineId['r1'] ?? []).map((t) => t.id)).toEqual(['t1', 't2'])
  })

  it('addRoutine surfaces errors and stores an error message', async () => {
    const { storeMod, serviceMod } = await freshStore()
    const { useRoutinesStore } = storeMod

    const createRoutineMock = vi.mocked(serviceMod.createRoutine)
    createRoutineMock.mockRejectedValue(new Error('boom'))

    await expect(
      useRoutinesStore.getState().addRoutine({ user_id: 'u1', title: 'Mi rutina' }),
    ).rejects.toThrow('boom')

    expect(useRoutinesStore.getState().error).toBe('boom')
  })

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
    }

    localStorage.setItem('nr-cache-routines-v1', JSON.stringify(cached))

    vi.resetModules()
    const { useRoutinesStore } = await import('../routinesStore')

    useRoutinesStore.getState().hydrateFromCache()

    const s = useRoutinesStore.getState()
    expect(s.selectedRoutineId).toBe('r1')
    expect(s.lastSyncedAt).toBe(cached.ts)
    expect(s.routines).toHaveLength(1)
    expect(s.tasksByRoutineId.r1?.[0]?.id).toBe('t1')
  })

  it('refreshAll loads lists, groups tasks by routine and clears offline', async () => {
    const { storeMod, serviceMod } = await freshStore()
    const { useRoutinesStore } = storeMod

    vi.mocked(serviceMod.listRoutines).mockResolvedValue([
      {
        id: 'r1',
        user_id: 'u1',
        title: 'Rutina',
        notes: null,
        created_at: new Date(2025, 0, 1, 12).toISOString(),
        updated_at: new Date(2025, 0, 1, 12).toISOString(),
      },
    ])
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
    ])
    vi.mocked(serviceMod.listTaskEvents).mockResolvedValue([])

    await useRoutinesStore.getState().refreshAll({ since: '2026-07-15T00:00:00.000Z' })

    const s = useRoutinesStore.getState()
    expect(s.error).toBeNull()
    expect(s.offline).toBe(false)
    expect(s.lastSyncedAt).not.toBeNull()
    expect(s.routines).toHaveLength(1)
    expect(s.tasksByRoutineId.r1?.[0]?.id).toBe('t1')
    expect(localStorage.getItem('nr-cache-routines-v1')).not.toBeNull()
  })

  it('refreshAll stores error and marks offline when service fails', async () => {
    const { storeMod, serviceMod } = await freshStore()
    const { useRoutinesStore } = storeMod

    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: false,
    })

    vi.mocked(serviceMod.listRoutines).mockRejectedValue(new Error('network down'))

    await useRoutinesStore.getState().refreshAll()

    const s = useRoutinesStore.getState()
    expect(s.loading).toBe(false)
    expect(s.error).toBe('network down')
    expect(s.offline).toBe(true)
  })

  it('loadRoutines clears selectedRoutineId when missing from response', async () => {
    const { storeMod, serviceMod } = await freshStore()
    const { useRoutinesStore } = storeMod

    useRoutinesStore.setState({ selectedRoutineId: 'gone' })
    vi.mocked(serviceMod.listRoutines).mockResolvedValue([])

    await useRoutinesStore.getState().loadRoutines()

    expect(useRoutinesStore.getState().selectedRoutineId).toBeNull()
  })

  it('setTaskDone updates task entries and appends an optimistic event', async () => {
    const { storeMod, serviceMod } = await freshStore()
    const { useRoutinesStore } = storeMod

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
        ],
      },
    })

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
    })

    await useRoutinesStore.getState().setTaskDone({ id: 't1', routine_id: 'r1', is_done: true })

    const s = useRoutinesStore.getState()
    expect(s.allTasks[0]?.is_done).toBe(true)
    expect(s.tasksByRoutineId.r1?.[0]?.is_done).toBe(true)
    expect(s.taskEvents[0]?.event_type).toBe('completed')
  })

  it('removeTask removes task from global and routine lists', async () => {
    const { storeMod, serviceMod } = await freshStore()
    const { useRoutinesStore } = storeMod

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
        ],
      },
    })

    vi.mocked(serviceMod.deleteTask).mockResolvedValue(undefined)

    await useRoutinesStore.getState().removeTask({ id: 't1', routine_id: 'r1' })

    const s = useRoutinesStore.getState()
    expect(s.allTasks).toHaveLength(0)
    expect(s.tasksByRoutineId.r1).toEqual([])
  })

  it('removeRoutine drops selected routine and routine task map entry', async () => {
    const { storeMod, serviceMod } = await freshStore()
    const { useRoutinesStore } = storeMod

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
      ],
      tasksByRoutineId: {
        r1: [],
      },
    })

    vi.mocked(serviceMod.deleteRoutine).mockResolvedValue(undefined)

    await useRoutinesStore.getState().removeRoutine('r1')

    const s = useRoutinesStore.getState()
    expect(s.routines).toHaveLength(0)
    expect(s.selectedRoutineId).toBeNull()
    expect(s.tasksByRoutineId.r1).toBeUndefined()
  })

  it('loadAllTasks and loadTaskEvents update store slices', async () => {
    const { storeMod, serviceMod } = await freshStore()
    const { useRoutinesStore } = storeMod

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
    ])
    vi.mocked(serviceMod.listTaskEvents).mockResolvedValue([
      {
        id: 'e1',
        user_id: 'u1',
        routine_id: 'r1',
        routine_task_id: 't1',
        event_type: 'completed',
        created_at: new Date(2025, 0, 2, 12).toISOString(),
      },
    ])

    await useRoutinesStore.getState().loadAllTasks()
    await useRoutinesStore.getState().loadTaskEvents({ since: '2025-01-01T00:00:00.000Z' })

    const s = useRoutinesStore.getState()
    expect(s.allTasks).toHaveLength(1)
    expect(s.taskEvents).toHaveLength(1)
  })

  it('loadTasks stores tasks by routine id', async () => {
    const { storeMod, serviceMod } = await freshStore()
    const { useRoutinesStore } = storeMod

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
    ])

    await useRoutinesStore.getState().loadTasks('r2')
    expect(useRoutinesStore.getState().tasksByRoutineId.r2?.[0]?.id).toBe('t1')
  })

  it('addTask prepends into allTasks and appends into routine bucket', async () => {
    const { storeMod, serviceMod } = await freshStore()
    const { useRoutinesStore } = storeMod

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
    })

    await useRoutinesStore.getState().addTask({ user_id: 'u1', routine_id: 'r3', title: 'Task r3' })

    const s = useRoutinesStore.getState()
    expect(s.allTasks[0]?.id).toBe('t1')
    expect(s.tasksByRoutineId.r3?.[0]?.id).toBe('t1')
  })

  it('editRoutine updates existing routine entity', async () => {
    const { storeMod, serviceMod } = await freshStore()
    const { useRoutinesStore } = storeMod

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
      ],
    })

    vi.mocked(serviceMod.updateRoutine).mockResolvedValue({
      id: 'r1',
      user_id: 'u1',
      title: 'After',
      notes: 'Updated',
      created_at: new Date(2025, 0, 1, 12).toISOString(),
      updated_at: new Date(2025, 0, 2, 12).toISOString(),
    })

    await useRoutinesStore.getState().editRoutine({ id: 'r1', title: 'After', notes: 'Updated' })

    expect(useRoutinesStore.getState().routines[0]?.title).toBe('After')
  })

  it('stores fallback error messages for non-Error throws in task actions', async () => {
    const { storeMod, serviceMod } = await freshStore()
    const { useRoutinesStore } = storeMod

    vi.mocked(serviceMod.createTask).mockRejectedValue('x')
    await useRoutinesStore.getState().addTask({ user_id: 'u1', routine_id: 'r3', title: 'Task r3' })
    expect(useRoutinesStore.getState().error).toBe('Failed to create task')

    vi.mocked(serviceMod.toggleTaskDone).mockRejectedValue('x')
    await useRoutinesStore.getState().setTaskDone({ id: 't1', routine_id: 'r3', is_done: true })
    expect(useRoutinesStore.getState().error).toBe('Failed to update task')

    vi.mocked(serviceMod.deleteTask).mockRejectedValue('x')
    await useRoutinesStore.getState().removeTask({ id: 't1', routine_id: 'r3' })
    expect(useRoutinesStore.getState().error).toBe('Failed to delete task')
  })
})
