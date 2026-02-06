export type Routine = {
  id: string
  user_id: string
  title: string
  notes: string | null
  created_at: string
  updated_at: string
}

export type RoutineTask = {
  id: string
  user_id: string
  routine_id: string
  title: string
  description?: string | null
  due_date?: string | null
  due_time?: string | null
  is_done: boolean
  completed_at?: string | null
  created_at: string
  updated_at: string
}

export type RoutineTaskEvent = {
  id: string
  user_id: string
  routine_id: string
  routine_task_id: string
  event_type: 'completed' | 'uncompleted'
  created_at: string
}
