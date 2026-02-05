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
  is_done: boolean
  created_at: string
  updated_at: string
}
