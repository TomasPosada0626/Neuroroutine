import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type DueTaskRow = {
  id: string
  title: string
  due_date: string | null
  routines: {
    user_id: string
    title: string
  } | null
}

type ReminderPreference = {
  user_id: string
  email_enabled: boolean
  reminder_hour: number
  timezone: string
}

function todayYmd() {
  return new Date().toISOString().slice(0, 10)
}

Deno.serve(async () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !serviceRole) {
    return new Response(
      JSON.stringify({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const supabase = createClient(supabaseUrl, serviceRole)
  const dueDate = todayYmd()

  const { data: dueTasks, error: dueError } = await supabase
    .from('routine_tasks')
    .select('id,title,due_date,routines!inner(user_id,title)')
    .eq('is_done', false)
    .eq('due_date', dueDate)

  if (dueError) {
    return new Response(JSON.stringify({ error: dueError.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const tasks = (dueTasks ?? []) as DueTaskRow[]
  if (tasks.length === 0) {
    return new Response(
      JSON.stringify({ ok: true, dueDate, remindersPrepared: 0, note: 'No due tasks' }),
      { headers: { 'Content-Type': 'application/json' } },
    )
  }

  const userIds = Array.from(
    new Set(
      tasks
        .map((t) => t.routines?.user_id)
        .filter((id): id is string => typeof id === 'string'),
    ),
  )

  const { data: preferences, error: prefError } = await supabase
    .from('reminder_preferences')
    .select('user_id,email_enabled,reminder_hour,timezone')
    .in('user_id', userIds)

  if (prefError) {
    return new Response(JSON.stringify({ error: prefError.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const prefByUser = new Map(
    ((preferences ?? []) as ReminderPreference[]).map((p) => [p.user_id, p]),
  )

  // MVP dispatch strategy:
  // 1) collect due tasks by user,
  // 2) write app_events entries as reminder-ready signals,
  // 3) optional providers (email/push) can consume these events.
  let remindersPrepared = 0

  for (const task of tasks) {
    const userId = task.routines?.user_id
    if (!userId) continue

    const pref = prefByUser.get(userId)
    if (pref && !pref.email_enabled) continue

    const { error: eventError } = await supabase.from('app_events').insert({
      user_id: userId,
      event_name: 'reminder_due_task',
      routine_task_id: task.id,
      meta: {
        due_date: task.due_date,
        task_title: task.title,
        routine_title: task.routines?.title ?? null,
      },
    })

    if (!eventError) remindersPrepared += 1
  }

  return new Response(
    JSON.stringify({ ok: true, dueDate, remindersPrepared }),
    { headers: { 'Content-Type': 'application/json' } },
  )
})
