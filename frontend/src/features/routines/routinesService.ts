import { supabase } from '@/shared/api'
import type { Routine, RoutineTask, RoutineTaskEvent } from './types'

export async function listRoutines(): Promise<Routine[]> {
  const { data, error } = await supabase
    .from('routines')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as Routine[]
}

export async function searchRoutines(query: string): Promise<Routine[]> {
  const q = query.trim()
  if (!q) return listRoutines()

  const tsQuery = q
    .split(/\s+/)
    .filter(Boolean)
    .join(' & ')

  const { data, error } = await supabase
    .from('routines')
    .select('*')
    .textSearch('title', tsQuery, { config: 'spanish', type: 'websearch' })
    .order('created_at', { ascending: false })

  if (!error) return (data ?? []) as Routine[]

  const { data: fallbackData, error: fallbackError } = await supabase
    .from('routines')
    .select('*')
    .ilike('title', `%${q}%`)
    .order('created_at', { ascending: false })

  if (fallbackError) throw fallbackError
  return (fallbackData ?? []) as Routine[]
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

export async function listAllTasks(): Promise<RoutineTask[]> {
  const { data, error } = await supabase
    .from('routine_tasks')
    .select('*')
    .order('updated_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as RoutineTask[]
}

export async function listTaskEvents(params?: { since?: string; limit?: number }): Promise<RoutineTaskEvent[]> {
  const limit = params?.limit ?? 5000
  let query = supabase
    .from('routine_task_events')
    .select('id,user_id,routine_id,routine_task_id,event_type,created_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (params?.since) query = query.gte('created_at', params.since)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as RoutineTaskEvent[]
}

export async function createTask(input: {
  user_id: string
  routine_id: string
  title: string
  description?: string | null
  due_date?: string | null
  due_time?: string | null
}): Promise<RoutineTask> {
  // Insert minimal columns first so the app keeps working even if the DB hasn't been migrated.
  const { data: created, error: insertError } = await supabase
    .from('routine_tasks')
    .insert({ user_id: input.user_id, routine_id: input.routine_id, title: input.title })
    .select('*')
    .single()

  if (insertError) throw insertError
  const base = created as RoutineTask

  const hasMeta =
    (typeof input.description === 'string' && input.description.trim().length > 0) ||
    (typeof input.due_date === 'string' && input.due_date.trim().length > 0) ||
    (typeof input.due_time === 'string' && input.due_time.trim().length > 0)

  if (!hasMeta) return base

  try {
    const patch = {
      description: input.description?.trim() ? input.description.trim() : null,
      due_date: input.due_date?.trim() ? input.due_date.trim() : null,
      due_time: input.due_time?.trim() ? input.due_time.trim() : null,
    }

    const { data: updated, error: updateError } = await supabase
      .from('routine_tasks')
      .update(patch)
      .eq('id', base.id)
      .select('*')
      .single()

    if (updateError) return base
    return updated as RoutineTask
  } catch {
    return base
  }
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
