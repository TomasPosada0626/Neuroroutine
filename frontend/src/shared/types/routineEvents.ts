export type RoutineTaskEvent = {
  id: string
  user_id: string
  routine_id: string
  routine_task_id: string
  event_type: 'completed' | 'uncompleted'
  created_at: string
}
