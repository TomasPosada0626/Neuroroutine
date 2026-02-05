import { create } from 'zustand'
import type { Routine, RoutineTask, RoutineTaskEvent } from './types'
import {
  createRoutine,
  createTask,
  deleteRoutine,
  deleteTask,
  listAllTasks,
  listRoutines,
  listTaskEvents,
  listTasks,
  toggleTaskDone,
  updateRoutine,
} from './routinesService'

type RoutinesState = {
  loading: boolean
  error: string | null

  routines: Routine[]
  selectedRoutineId: string | null
  tasksByRoutineId: Record<string, RoutineTask[]>
  allTasks: RoutineTask[]
  taskEvents: RoutineTaskEvent[]

  loadRoutines: () => Promise<void>
  loadAllTasks: () => Promise<void>
  loadTaskEvents: (params?: { since?: string }) => Promise<void>
  selectRoutine: (id: string | null) => void

  addRoutine: (input: { user_id: string; title: string; notes?: string | null }) => Promise<void>
  editRoutine: (input: { id: string; title: string; notes?: string | null }) => Promise<void>
  removeRoutine: (id: string) => Promise<void>

  loadTasks: (routineId: string) => Promise<void>
  addTask: (input: { user_id: string; routine_id: string; title: string }) => Promise<void>
  setTaskDone: (input: { id: string; routine_id: string; is_done: boolean }) => Promise<void>
  removeTask: (input: { id: string; routine_id: string }) => Promise<void>
}

export const useRoutinesStore = create<RoutinesState>((set, get) => ({
  loading: false,
  error: null,

  routines: [],
  selectedRoutineId: null,
  tasksByRoutineId: {},
  allTasks: [],
  taskEvents: [],

  loadRoutines: async () => {
    set({ loading: true, error: null })
    try {
      const routines = await listRoutines()
      set({ routines })
      const selected = get().selectedRoutineId
      if (selected && !routines.some((r) => r.id === selected)) {
        set({ selectedRoutineId: null })
      }
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to load routines' })
    } finally {
      set({ loading: false })
    }
  },

  loadAllTasks: async () => {
    set({ loading: true, error: null })
    try {
      const allTasks = await listAllTasks()
      set({ allTasks })
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to load tasks' })
    } finally {
      set({ loading: false })
    }
  },

  loadTaskEvents: async (params) => {
    set({ loading: true, error: null })
    try {
      const taskEvents = await listTaskEvents({ since: params?.since })
      set({ taskEvents })
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to load task events' })
    } finally {
      set({ loading: false })
    }
  },

  selectRoutine: (id) => set({ selectedRoutineId: id }),

  addRoutine: async (input) => {
    set({ loading: true, error: null })
    try {
      const created = await createRoutine(input)
      set((s) => ({ routines: [created, ...s.routines], selectedRoutineId: created.id }))
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to create routine' })
    } finally {
      set({ loading: false })
    }
  },

  editRoutine: async (input) => {
    set({ loading: true, error: null })
    try {
      const updated = await updateRoutine(input)
      set((s) => ({ routines: s.routines.map((r) => (r.id === updated.id ? updated : r)) }))
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to update routine' })
    } finally {
      set({ loading: false })
    }
  },

  removeRoutine: async (id) => {
    set({ loading: true, error: null })
    try {
      await deleteRoutine(id)
      set((s) => {
        const nextRoutines = s.routines.filter((r) => r.id !== id)
        const restTasks = { ...s.tasksByRoutineId }
        delete restTasks[id]
        return {
          routines: nextRoutines,
          tasksByRoutineId: restTasks,
          selectedRoutineId: s.selectedRoutineId === id ? null : s.selectedRoutineId,
        }
      })
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to delete routine' })
    } finally {
      set({ loading: false })
    }
  },

  loadTasks: async (routineId) => {
    set({ loading: true, error: null })
    try {
      const tasks = await listTasks(routineId)
      set((s) => ({ tasksByRoutineId: { ...s.tasksByRoutineId, [routineId]: tasks } }))
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to load tasks' })
    } finally {
      set({ loading: false })
    }
  },

  addTask: async (input) => {
    set({ loading: true, error: null })
    try {
      const created = await createTask(input)
      set((s) => ({
        allTasks: [created, ...s.allTasks],
        tasksByRoutineId: {
          ...s.tasksByRoutineId,
          [input.routine_id]: [...(s.tasksByRoutineId[input.routine_id] ?? []), created],
        },
      }))
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to create task' })
    } finally {
      set({ loading: false })
    }
  },

  setTaskDone: async (input) => {
    set({ loading: true, error: null })
    try {
      const updated = await toggleTaskDone({ id: input.id, is_done: input.is_done })
      const eventType: RoutineTaskEvent['event_type'] = input.is_done ? 'completed' : 'uncompleted'
      const optimisticEvent: RoutineTaskEvent = {
        id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `local_${Date.now()}`,
        user_id: (updated as RoutineTask).user_id,
        routine_id: (updated as RoutineTask).routine_id,
        routine_task_id: updated.id,
        event_type: eventType,
        created_at: new Date().toISOString(),
      }

      set((s) => ({
        allTasks: s.allTasks.map((t) => (t.id === updated.id ? updated : t)),
        taskEvents: [optimisticEvent, ...s.taskEvents],
        tasksByRoutineId: {
          ...s.tasksByRoutineId,
          [input.routine_id]: (s.tasksByRoutineId[input.routine_id] ?? []).map((t) =>
            t.id === updated.id ? updated : t,
          ),
        },
      }))
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to update task' })
    } finally {
      set({ loading: false })
    }
  },

  removeTask: async (input) => {
    set({ loading: true, error: null })
    try {
      await deleteTask(input.id)
      set((s) => ({
        allTasks: s.allTasks.filter((t) => t.id !== input.id),
        tasksByRoutineId: {
          ...s.tasksByRoutineId,
          [input.routine_id]: (s.tasksByRoutineId[input.routine_id] ?? []).filter(
            (t) => t.id !== input.id,
          ),
        },
      }))
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to delete task' })
    } finally {
      set({ loading: false })
    }
  },
}))

export function useRoutines() {
  return useRoutinesStore()
}
