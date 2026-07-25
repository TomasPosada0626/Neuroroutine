import { create } from 'zustand';
import type { Routine, RoutineTask, RoutineTaskEvent } from './types';
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
} from './routinesService';
import { logAppEvent } from '@/shared/observability/eventLog';
import {
  enqueueTaskInsert,
  listQueuedTaskInserts,
  removeQueuedTaskInsert,
} from '@/shared/offline/taskSyncQueue';

const CACHE_KEY = 'nr-cache-routines-v1';

type RoutinesState = {
  loading: boolean;
  error: string | null;

  offline: boolean;
  lastSyncedAt: string | null;

  routines: Routine[];
  selectedRoutineId: string | null;
  tasksByRoutineId: Record<string, RoutineTask[]>;
  allTasks: RoutineTask[];
  taskEvents: RoutineTaskEvent[];

  hydrateFromCache: (userId?: string | null) => void;
  refreshAll: (params?: { since?: string; userId?: string | null }) => Promise<void>;
  syncOfflineTasks: () => Promise<number>;

  loadRoutines: () => Promise<void>;
  loadAllTasks: () => Promise<void>;
  loadTaskEvents: (params?: { since?: string }) => Promise<void>;
  selectRoutine: (id: string | null) => void;

  addRoutine: (input: {
    user_id: string;
    title: string;
    notes?: string | null;
  }) => Promise<Routine>;
  editRoutine: (input: { id: string; title: string; notes?: string | null }) => Promise<void>;
  removeRoutine: (id: string) => Promise<void>;

  loadTasks: (routineId: string) => Promise<void>;
  addTask: (input: {
    user_id: string;
    routine_id: string;
    title: string;
    description?: string | null;
    due_date?: string | null;
    due_time?: string | null;
  }) => Promise<void>;
  addTasksBulk: (input: {
    user_id: string;
    routine_id: string;
    tasks: Array<{
      title: string;
      description?: string | null;
      due_date?: string | null;
      due_time?: string | null;
    }>;
  }) => Promise<void>;
  setTaskDone: (input: { id: string; routine_id: string; is_done: boolean }) => Promise<void>;
  removeTask: (input: { id: string; routine_id: string }) => Promise<void>;
};

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

  syncOfflineTasks: async () => {
    const startedAt = performance.now();
    const isOnline = typeof navigator === 'undefined' ? true : navigator.onLine;
    if (!isOnline) {
      set({ offline: true });
      return 0;
    }

    const pending = await listQueuedTaskInserts();
    if (pending.length === 0) {
      set({ offline: false });
      return 0;
    }

    let synced = 0;
    for (const item of pending) {
      try {
        const created = await createTask({
          user_id: item.user_id,
          routine_id: item.routine_id,
          title: item.title,
          description: item.description ?? null,
          due_date: item.due_date ?? null,
          due_time: item.due_time ?? null,
        });

        set((s) => ({
          allTasks: s.allTasks.map((t) => (t.id === item.local_id ? created : t)),
          tasksByRoutineId: {
            ...s.tasksByRoutineId,
            [item.routine_id]: (s.tasksByRoutineId[item.routine_id] ?? []).map((t) =>
              t.id === item.local_id ? created : t,
            ),
          },
        }));

        await removeQueuedTaskInsert(item.local_id);
        synced += 1;
      } catch {
        set({ offline: true, error: 'Some offline tasks could not be synced yet' });
      }
    }

    if (synced > 0) {
      const ts = new Date().toISOString();
      set({ offline: false, lastSyncedAt: ts });

      const firstUserId = pending[0]?.user_id;
      if (firstUserId) {
        void logAppEvent({
          user_id: firstUserId,
          event_name: 'offline_sync_completed',
          meta: {
            synced_count: synced,
            duration_ms: Math.round(performance.now() - startedAt),
          },
        });
      }
    }

    return synced;
  },

  hydrateFromCache: (userId) => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) {
        if (userId) {
          set({
            routines: [],
            allTasks: [],
            taskEvents: [],
            tasksByRoutineId: {},
            selectedRoutineId: null,
            lastSyncedAt: null,
          });
        }
        return;
      }

      const parsed = JSON.parse(raw) as {
        ts?: string;
        userId?: string | null;
        routines?: Routine[];
        allTasks?: RoutineTask[];
        taskEvents?: RoutineTaskEvent[];
        selectedRoutineId?: string | null;
      };

      if (userId) {
        const cachedUserId = typeof parsed.userId === 'string' ? parsed.userId : null;
        if (cachedUserId !== userId) {
          set({
            routines: [],
            allTasks: [],
            taskEvents: [],
            tasksByRoutineId: {},
            selectedRoutineId: null,
            lastSyncedAt: null,
          });
          return;
        }
      }

      const routines = Array.isArray(parsed.routines) ? parsed.routines : [];
      const allTasks = Array.isArray(parsed.allTasks) ? parsed.allTasks : [];
      const taskEvents = Array.isArray(parsed.taskEvents) ? parsed.taskEvents : [];

      const tasksByRoutineId: Record<string, RoutineTask[]> = {};
      for (const t of allTasks) {
        const list = tasksByRoutineId[t.routine_id] ?? [];
        list.push(t);
        tasksByRoutineId[t.routine_id] = list;
      }

      set({
        routines,
        allTasks,
        taskEvents,
        tasksByRoutineId,
        selectedRoutineId:
          typeof parsed.selectedRoutineId === 'string' ? parsed.selectedRoutineId : null,
        lastSyncedAt: typeof parsed.ts === 'string' ? parsed.ts : null,
      });
    } catch {
      // ignore cache errors
    }
  },

  refreshAll: async (params) => {
    set({ loading: true, error: null });
    try {
      const [routines, allTasks, taskEvents] = await Promise.all([
        listRoutines(),
        listAllTasks(),
        listTaskEvents({ since: params?.since }),
      ]);

      const tasksByRoutineId: Record<string, RoutineTask[]> = {};
      for (const t of allTasks) {
        const list = tasksByRoutineId[t.routine_id] ?? [];
        list.push(t);
        tasksByRoutineId[t.routine_id] = list;
      }

      const ts = new Date().toISOString();
      set({ routines, allTasks, taskEvents, tasksByRoutineId, offline: false, lastSyncedAt: ts });

      try {
        const cacheUserId =
          typeof params?.userId === 'string'
            ? params.userId
            : (routines[0]?.user_id ?? allTasks[0]?.user_id ?? null);

        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({
            ts,
            userId: cacheUserId,
            routines,
            allTasks,
            taskEvents,
            selectedRoutineId: get().selectedRoutineId,
          }),
        );
      } catch {
        // ignore
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to refresh';
      set({
        error: message,
        offline: typeof navigator !== 'undefined' ? !navigator.onLine : false,
      });
    } finally {
      set({ loading: false });
    }
  },

  loadRoutines: async () => {
    set({ loading: true, error: null });
    try {
      const routines = await listRoutines();
      set({ routines });
      const selected = get().selectedRoutineId;
      if (selected && !routines.some((r) => r.id === selected)) {
        set({ selectedRoutineId: null });
      }
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to load routines' });
    } finally {
      set({ loading: false });
    }
  },

  loadAllTasks: async () => {
    set({ loading: true, error: null });
    try {
      const allTasks = await listAllTasks();
      set({ allTasks });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to load tasks' });
    } finally {
      set({ loading: false });
    }
  },

  loadTaskEvents: async (params) => {
    set({ loading: true, error: null });
    try {
      const taskEvents = await listTaskEvents({ since: params?.since });
      set({ taskEvents });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to load task events' });
    } finally {
      set({ loading: false });
    }
  },

  selectRoutine: (id) => set({ selectedRoutineId: id }),

  addRoutine: async (input) => {
    set({ loading: true, error: null });
    const startedAt = performance.now();
    try {
      const created = await createRoutine(input);
      set((s) => ({ routines: [created, ...s.routines], selectedRoutineId: created.id }));

      void logAppEvent({
        user_id: input.user_id,
        event_name: 'routine_created',
        routine_id: created.id,
        meta: {
          duration_ms: Math.round(performance.now() - startedAt),
        },
      });

      return created;
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to create routine' });
      throw e;
    } finally {
      set({ loading: false });
    }
  },

  editRoutine: async (input) => {
    set({ loading: true, error: null });
    try {
      const updated = await updateRoutine(input);
      set((s) => ({ routines: s.routines.map((r) => (r.id === updated.id ? updated : r)) }));
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to update routine' });
    } finally {
      set({ loading: false });
    }
  },

  removeRoutine: async (id) => {
    set({ loading: true, error: null });
    try {
      await deleteRoutine(id);

      const userId = get().routines.find((r) => r.id === id)?.user_id;
      if (userId) {
        void logAppEvent({ user_id: userId, event_name: 'routine_deleted', routine_id: id });
      }

      set((s) => {
        const nextRoutines = s.routines.filter((r) => r.id !== id);
        const restTasks = { ...s.tasksByRoutineId };
        delete restTasks[id];
        return {
          routines: nextRoutines,
          tasksByRoutineId: restTasks,
          selectedRoutineId: s.selectedRoutineId === id ? null : s.selectedRoutineId,
        };
      });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to delete routine' });
    } finally {
      set({ loading: false });
    }
  },

  loadTasks: async (routineId) => {
    set({ loading: true, error: null });
    try {
      const tasks = await listTasks(routineId);
      set((s) => ({ tasksByRoutineId: { ...s.tasksByRoutineId, [routineId]: tasks } }));
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to load tasks' });
    } finally {
      set({ loading: false });
    }
  },

  addTasksBulk: async (input) => {
    set({ loading: true, error: null });
    const startedAt = performance.now();
    try {
      const createdTasks: RoutineTask[] = [];
      const isOnline = typeof navigator === 'undefined' ? true : navigator.onLine;

      for (const t of input.tasks) {
        const title = t.title.trim();
        if (!title) continue;

        if (!isOnline) {
          const now = new Date().toISOString();
          const localId = `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
          const localTask: RoutineTask = {
            id: localId,
            user_id: input.user_id,
            routine_id: input.routine_id,
            title,
            description: t.description ?? null,
            due_date: t.due_date ?? null,
            due_time: t.due_time ?? null,
            is_done: false,
            completed_at: null,
            created_at: now,
            updated_at: now,
          };
          createdTasks.push(localTask);
          await enqueueTaskInsert({
            local_id: localId,
            user_id: input.user_id,
            routine_id: input.routine_id,
            title,
            description: t.description ?? null,
            due_date: t.due_date ?? null,
            due_time: t.due_time ?? null,
            queued_at: now,
          });
          continue;
        }

        const created = await createTask({
          user_id: input.user_id,
          routine_id: input.routine_id,
          title,
          description: t.description ?? null,
          due_date: t.due_date ?? null,
          due_time: t.due_time ?? null,
        });
        createdTasks.push(created);
      }

      if (createdTasks.length) {
        void logAppEvent({
          user_id: input.user_id,
          event_name: 'tasks_created_bulk',
          routine_id: input.routine_id,
          meta: {
            count: createdTasks.length,
            duration_ms: Math.round(performance.now() - startedAt),
          },
        });
      }

      if (createdTasks.length) {
        set((s) => ({
          allTasks: [...createdTasks.slice().reverse(), ...s.allTasks],
          tasksByRoutineId: {
            ...s.tasksByRoutineId,
            [input.routine_id]: [...(s.tasksByRoutineId[input.routine_id] ?? []), ...createdTasks],
          },
        }));
      }

      if (!isOnline && createdTasks.length > 0) {
        set({ offline: true });
      }
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to create tasks' });
    } finally {
      set({ loading: false });
    }
  },

  addTask: async (input) => {
    set({ loading: true, error: null });
    const startedAt = performance.now();
    try {
      const isOnline = typeof navigator === 'undefined' ? true : navigator.onLine;

      if (!isOnline) {
        const now = new Date().toISOString();
        const localId = `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const localTask: RoutineTask = {
          id: localId,
          user_id: input.user_id,
          routine_id: input.routine_id,
          title: input.title,
          description: input.description ?? null,
          due_date: input.due_date ?? null,
          due_time: input.due_time ?? null,
          is_done: false,
          completed_at: null,
          created_at: now,
          updated_at: now,
        };

        await enqueueTaskInsert({
          local_id: localId,
          user_id: input.user_id,
          routine_id: input.routine_id,
          title: input.title,
          description: input.description ?? null,
          due_date: input.due_date ?? null,
          due_time: input.due_time ?? null,
          queued_at: now,
        });

        set((s) => ({
          offline: true,
          allTasks: [localTask, ...s.allTasks],
          tasksByRoutineId: {
            ...s.tasksByRoutineId,
            [input.routine_id]: [...(s.tasksByRoutineId[input.routine_id] ?? []), localTask],
          },
        }));

        return;
      }

      const created = await createTask(input);
      set((s) => ({
        allTasks: [created, ...s.allTasks],
        tasksByRoutineId: {
          ...s.tasksByRoutineId,
          [input.routine_id]: [...(s.tasksByRoutineId[input.routine_id] ?? []), created],
        },
      }));

      void logAppEvent({
        user_id: input.user_id,
        event_name: 'task_created',
        routine_id: input.routine_id,
        routine_task_id: created.id,
        meta: {
          duration_ms: Math.round(performance.now() - startedAt),
        },
      });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to create task' });
    } finally {
      set({ loading: false });
    }
  },

  setTaskDone: async (input) => {
    set({ loading: true, error: null });
    const startedAt = performance.now();
    try {
      const updated = await toggleTaskDone({ id: input.id, is_done: input.is_done });
      const eventType: RoutineTaskEvent['event_type'] = input.is_done ? 'completed' : 'uncompleted';
      const optimisticEvent: RoutineTaskEvent = {
        id:
          typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID()
            : `local_${Date.now()}`,
        user_id: (updated as RoutineTask).user_id,
        routine_id: (updated as RoutineTask).routine_id,
        routine_task_id: updated.id,
        event_type: eventType,
        created_at: new Date().toISOString(),
      };

      set((s) => ({
        allTasks: s.allTasks.map((t) => (t.id === updated.id ? updated : t)),
        taskEvents: [optimisticEvent, ...s.taskEvents],
        tasksByRoutineId: {
          ...s.tasksByRoutineId,
          [input.routine_id]: (s.tasksByRoutineId[input.routine_id] ?? []).map((t) =>
            t.id === updated.id ? updated : t,
          ),
        },
      }));

      void logAppEvent({
        user_id: (updated as RoutineTask).user_id,
        event_name: input.is_done ? 'task_completed' : 'task_uncompleted',
        routine_id: input.routine_id,
        routine_task_id: updated.id,
        meta: {
          duration_ms: Math.round(performance.now() - startedAt),
        },
      });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to update task' });
    } finally {
      set({ loading: false });
    }
  },

  removeTask: async (input) => {
    set({ loading: true, error: null });
    try {
      await deleteTask(input.id);

      const userId = get().allTasks.find((t) => t.id === input.id)?.user_id;
      if (userId) {
        void logAppEvent({
          user_id: userId,
          event_name: 'task_deleted',
          routine_id: input.routine_id,
          routine_task_id: input.id,
        });
      }

      set((s) => ({
        allTasks: s.allTasks.filter((t) => t.id !== input.id),
        tasksByRoutineId: {
          ...s.tasksByRoutineId,
          [input.routine_id]: (s.tasksByRoutineId[input.routine_id] ?? []).filter(
            (t) => t.id !== input.id,
          ),
        },
      }));
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to delete task' });
    } finally {
      set({ loading: false });
    }
  },
}));

export function useRoutines() {
  return useRoutinesStore();
}
