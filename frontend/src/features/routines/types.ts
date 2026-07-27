export type Routine = {
  id: string;
  user_id: string;
  title: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type RoutineTask = {
  id: string;
  user_id: string;
  routine_id: string;
  title: string;
  description?: string | null;
  due_date?: string | null;
  due_time?: string | null;
  is_done: boolean;
  is_recurring?: boolean;
  // Optional weekly cadence for a recurring task (0=Sun..6=Sat, matching JS Date#getDay()).
  // Null/empty/undefined means "every day" — the original daily-only behavior.
  recurrence_days_of_week?: number[] | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type { RoutineTaskEvent } from '@/shared/types/routineEvents';
