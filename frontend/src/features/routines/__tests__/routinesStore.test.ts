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
})
