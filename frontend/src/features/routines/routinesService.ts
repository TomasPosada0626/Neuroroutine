import { supabase } from '@/shared/api';
import type { Routine, RoutineTask, RoutineTaskEvent } from './types';

async function getCurrentUserId(): Promise<string | null> {
  try {
    const auth = (
      supabase as {
        auth?: {
          getSession?: () => Promise<{
            data?: { session?: { user?: { id?: string } | null } | null };
          }>;
        };
      }
    ).auth;
    if (!auth?.getSession) return null;

    const { data } = await auth.getSession();
    return data?.session?.user?.id ?? null;
  } catch {
    return null;
  }
}

export async function listRoutines(): Promise<Routine[]> {
  const userId = await getCurrentUserId();

  let query = supabase.from('routines').select('*');
  if (userId) query = query.eq('user_id', userId);

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as Routine[];
}

export async function searchRoutines(query: string): Promise<Routine[]> {
  const userId = await getCurrentUserId();

  const q = query.trim();
  if (!q) return listRoutines();

  const { data: rpcData, error: rpcError } = await supabase.rpc('search_routines', {
    p_query: q,
    p_limit: 50,
  });

  if (!rpcError && Array.isArray(rpcData)) {
    return userId
      ? (rpcData as Routine[]).filter((r) => r.user_id === userId)
      : (rpcData as Routine[]);
  }

  const tsQuery = q.split(/\s+/).filter(Boolean).join(' & ');

  let textSearchQuery = supabase.from('routines').select('*');
  if (userId) textSearchQuery = textSearchQuery.eq('user_id', userId);

  const { data, error } = await textSearchQuery
    .textSearch('title', tsQuery, { config: 'spanish', type: 'websearch' })
    .order('created_at', { ascending: false });

  if (!error) return (data ?? []) as Routine[];

  let fallbackQuery = supabase.from('routines').select('*');
  if (userId) fallbackQuery = fallbackQuery.eq('user_id', userId);

  const { data: fallbackData, error: fallbackError } = await fallbackQuery
    .ilike('title', `%${q}%`)
    .order('created_at', { ascending: false });

  if (fallbackError) throw fallbackError;
  return (fallbackData ?? []) as Routine[];
}

export async function createRoutine(input: {
  user_id: string;
  title: string;
  notes?: string | null;
}): Promise<Routine> {
  const { data, error } = await supabase
    .from('routines')
    .insert({ user_id: input.user_id, title: input.title, notes: input.notes ?? null })
    .select('*')
    .single();

  if (error) throw error;
  return data as Routine;
}

export async function updateRoutine(input: {
  id: string;
  title: string;
  notes?: string | null;
}): Promise<Routine> {
  const { data, error } = await supabase
    .from('routines')
    .update({ title: input.title, notes: input.notes ?? null })
    .eq('id', input.id)
    .select('*')
    .single();

  if (error) throw error;
  return data as Routine;
}

export async function deleteRoutine(id: string): Promise<void> {
  const { error } = await supabase.from('routines').delete().eq('id', id);
  if (error) throw error;
}

export async function listTasks(routineId: string): Promise<RoutineTask[]> {
  const userId = await getCurrentUserId();

  let query = supabase.from('routine_tasks').select('*').eq('routine_id', routineId);
  if (userId) query = query.eq('user_id', userId);

  const { data, error } = await query.order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as RoutineTask[];
}

export async function listAllTasks(): Promise<RoutineTask[]> {
  const userId = await getCurrentUserId();

  let query = supabase.from('routine_tasks').select('*');
  if (userId) query = query.eq('user_id', userId);

  const { data, error } = await query.order('updated_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as RoutineTask[];
}

export async function listTaskEvents(params?: {
  since?: string;
  limit?: number;
}): Promise<RoutineTaskEvent[]> {
  const userId = await getCurrentUserId();

  const limit = params?.limit ?? 5000;
  let query = supabase
    .from('routine_task_events')
    .select('id,user_id,routine_id,routine_task_id,event_type,created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (userId) query = query.eq('user_id', userId);

  if (params?.since) query = query.gte('created_at', params.since);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as RoutineTaskEvent[];
}

export async function createTask(input: {
  user_id: string;
  routine_id: string;
  title: string;
  description?: string | null;
  due_date?: string | null;
  due_time?: string | null;
}): Promise<RoutineTask> {
  // Insert minimal columns first so the app keeps working even if the DB hasn't been migrated.
  const { data: created, error: insertError } = await supabase
    .from('routine_tasks')
    .insert({ user_id: input.user_id, routine_id: input.routine_id, title: input.title })
    .select('*')
    .single();

  if (insertError) throw insertError;
  const base = created as RoutineTask;

  const hasMeta =
    (typeof input.description === 'string' && input.description.trim().length > 0) ||
    (typeof input.due_date === 'string' && input.due_date.trim().length > 0) ||
    (typeof input.due_time === 'string' && input.due_time.trim().length > 0);

  if (!hasMeta) return base;

  try {
    const patch = {
      description: input.description?.trim() ? input.description.trim() : null,
      due_date: input.due_date?.trim() ? input.due_date.trim() : null,
      due_time: input.due_time?.trim() ? input.due_time.trim() : null,
    };

    const { data: updated, error: updateError } = await supabase
      .from('routine_tasks')
      .update(patch)
      .eq('id', base.id)
      .select('*')
      .single();

    if (updateError) return base;
    return updated as RoutineTask;
  } catch {
    return base;
  }
}

export async function toggleTaskDone(input: {
  id: string;
  is_done: boolean;
}): Promise<RoutineTask> {
  const { data, error } = await supabase
    .from('routine_tasks')
    .update({ is_done: input.is_done })
    .eq('id', input.id)
    .select('*')
    .single();

  if (error) throw error;
  return data as RoutineTask;
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from('routine_tasks').delete().eq('id', id);
  if (error) throw error;
}
