import { supabase } from '@/shared/api'
import type { Routine, RoutineTask } from './types'

export async function listRoutines(): Promise<Routine[]> {
  const { data, error } = await supabase
    .from('routines')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as Routine[]
}

export async function createRoutine(input: {
  user_id: string
  title: string
  notes?: string | null
}): Promise<Routine> {
  const { data, error } = await supabase
    .from('routines')
    .insert({ user_id: input.user_id, title: input.title, notes: input.notes ?? null })
    .select('*')
    .single()

  if (error) throw error
  return data as Routine
}

export async function updateRoutine(input: {
  id: string
  title: string
  notes?: string | null
}): Promise<Routine> {
  const { data, error } = await supabase
    .from('routines')
    .update({ title: input.title, notes: input.notes ?? null })
    .eq('id', input.id)
    .select('*')
    .single()

  if (error) throw error
  return data as Routine
}

export async function deleteRoutine(id: string): Promise<void> {
  const { error } = await supabase.from('routines').delete().eq('id', id)
  if (error) throw error
}

export async function listTasks(routineId: string): Promise<RoutineTask[]> {
  const { data, error } = await supabase
    .from('routine_tasks')
    .select('*')
    .eq('routine_id', routineId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data ?? []) as RoutineTask[]
}

export async function createTask(input: {
  user_id: string
  routine_id: string
  title: string
}): Promise<RoutineTask> {
  const { data, error } = await supabase
    .from('routine_tasks')
    .insert({ user_id: input.user_id, routine_id: input.routine_id, title: input.title })
    .select('*')
    .single()

  if (error) throw error
  return data as RoutineTask
}

export async function toggleTaskDone(input: {
  id: string
  is_done: boolean
}): Promise<RoutineTask> {
  const { data, error } = await supabase
    .from('routine_tasks')
    .update({ is_done: input.is_done })
    .eq('id', input.id)
    .select('*')
    .single()

  if (error) throw error
  return data as RoutineTask
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from('routine_tasks').delete().eq('id', id)
  if (error) throw error
}
