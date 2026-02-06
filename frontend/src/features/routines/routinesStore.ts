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

  offline: boolean
  lastSyncedAt: string | null

  routines: Routine[]
  selectedRoutineId: string | null
  tasksByRoutineId: Record<string, RoutineTask[]>
  allTasks: RoutineTask[]
  taskEvents: RoutineTaskEvent[]

  hydrateFromCache: () => void
  refreshAll: (params?: { since?: string }) => Promise<void>

  loadRoutines: () => Promise<void>
  loadAllTasks: () => Promise<void>
  loadTaskEvents: (params?: { since?: string }) => Promise<void>
  selectRoutine: (id: string | null) => void

  addRoutine: (input: { user_id: string; title: string; notes?: string | null }) => Promise<Routine>
  editRoutine: (input: { id: string; title: string; notes?: string | null }) => Promise<void>
  removeRoutine: (id: string) => Promise<void>

  loadTasks: (routineId: string) => Promise<void>
  addTask: (input: { user_id: string; routine_id: string; title: string; description?: string | null; due_date?: string | null; due_time?: string | null }) => Promise<void>
  addTasksBulk: (input: { user_id: string; routine_id: string; tasks: Array<{ title: string; description?: string | null; due_date?: string | null; due_time?: string | null }> }) => Promise<void>
  setTaskDone: (input: { id: string; routine_id: string; is_done: boolean }) => Promise<void>
  removeTask: (input: { id: string; routine_id: string }) => Promise<void>
}

export const useRoutinesStore = create<RoutinesState>((set, get) => ({
  loading: false,
  error: null,

  offline: false,
  lastSyncedAt: null,

  routines: [],
  selectedRoutineId: null,
  tasksByRoutineId: {},
  allTasks: [],
  taskEvents: [],

  hydrateFromCache: () => {
    try {
      const raw = localStorage.getItem('nr-cache-routines-v1')
      if (!raw) return
      const parsed = JSON.parse(raw) as {
        ts?: string
        routines?: Routine[]
        allTasks?: RoutineTask[]
        taskEvents?: RoutineTaskEvent[]
        selectedRoutineId?: string | null
      }

      const routines = Array.isArray(parsed.routines) ? parsed.routines : []
      const allTasks = Array.isArray(parsed.allTasks) ? parsed.allTasks : []
      const taskEvents = Array.isArray(parsed.taskEvents) ? parsed.taskEvents : []

      const tasksByRoutineId: Record<string, RoutineTask[]> = {}
      for (const t of allTasks) {
        const list = tasksByRoutineId[t.routine_id] ?? []
        list.push(t)
        tasksByRoutineId[t.routine_id] = list
      }

      set({
        routines,
        allTasks,
        taskEvents,
        tasksByRoutineId,
        selectedRoutineId: typeof parsed.selectedRoutineId === 'string' ? parsed.selectedRoutineId : null,
        lastSyncedAt: typeof parsed.ts === 'string' ? parsed.ts : null,
      })
    } catch {
      // ignore cache errors
    }
  },

  refreshAll: async (params) => {
    set({ loading: true, error: null })
    try {
      const [routines, allTasks, taskEvents] = await Promise.all([
        listRoutines(),
        listAllTasks(),
        listTaskEvents({ since: params?.since }),
      ])

      const tasksByRoutineId: Record<string, RoutineTask[]> = {}
      for (const t of allTasks) {
        const list = tasksByRoutineId[t.routine_id] ?? []
        list.push(t)
        tasksByRoutineId[t.routine_id] = list
      }

      const ts = new Date().toISOString()
      set({ routines, allTasks, taskEvents, tasksByRoutineId, offline: false, lastSyncedAt: ts })

      try {
        localStorage.setItem(
          'nr-cache-routines-v1',
          JSON.stringify({ ts, routines, allTasks, taskEvents, selectedRoutineId: get().selectedRoutineId }),
        )
      } catch {
        // ignore
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to refresh'
      set({ error: message, offline: typeof navigator !== 'undefined' ? !navigator.onLine : false })
    } finally {
      set({ loading: false })
    }
  },

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
      return created
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to create routine' })
      throw e
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

  addTasksBulk: async (input) => {
    set({ loading: true, error: null })
    try {
      const createdTasks: RoutineTask[] = []
      for (const t of input.tasks) {
        const title = t.title.trim()
        if (!title) continue
        const created = await createTask({
          user_id: input.user_id,
          routine_id: input.routine_id,
          title,
          description: t.description ?? null,
          due_date: t.due_date ?? null,
          due_time: t.due_time ?? null,
        })
        createdTasks.push(created)
      }

      if (createdTasks.length) {
        set((s) => ({
          allTasks: [...createdTasks.slice().reverse(), ...s.allTasks],
          tasksByRoutineId: {
            ...s.tasksByRoutineId,
            [input.routine_id]: [...(s.tasksByRoutineId[input.routine_id] ?? []), ...createdTasks],
          },
        }))
      }
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to create tasks' })
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
