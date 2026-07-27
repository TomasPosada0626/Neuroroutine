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

type ProfileRow = {
  id: string
  email: string
  first_name: string | null
}

function todayYmd() {
  return new Date().toISOString().slice(0, 10)
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function renderReminderEmail(params: { firstName: string | null; tasks: DueTaskRow[] }): {
  subject: string
  html: string
  text: string
} {
  const { firstName, tasks } = params
  const greetingName = firstName?.trim() ? escapeHtml(firstName.trim()) : 'hola'
  const count = tasks.length
  const subject =
    count === 1
      ? 'Tienes 1 tarea pendiente para hoy en NeuroRoutine'
      : `Tienes ${count} tareas pendientes para hoy en NeuroRoutine`

  const itemsHtml = tasks
    .map(
      (t) =>
        `<li>${escapeHtml(t.title)}${t.routines?.title ? ` <span style="color:#64748b">(${escapeHtml(t.routines.title)})</span>` : ''}</li>`,
    )
    .join('')
  const itemsText = tasks
    .map((t) => `- ${t.title}${t.routines?.title ? ` (${t.routines.title})` : ''}`)
    .join('\n')

  const html = `<!doctype html>
<html>
  <body style="font-family: ui-sans-serif, system-ui, sans-serif; color: #0f172a; padding: 24px;">
    <p>Hola ${greetingName},</p>
    <p>Estas tareas vencen hoy en NeuroRoutine:</p>
    <ul>${itemsHtml}</ul>
    <p style="color:#64748b; font-size: 13px;">Recibes esto porque activaste recordatorios por email en tu cuenta.</p>
  </body>
</html>`

  const text = `Hola ${firstName?.trim() || 'hola'},\n\nEstas tareas vencen hoy en NeuroRoutine:\n${itemsText}\n\nRecibes esto porque activaste recordatorios por email en tu cuenta.`

  return { subject, html, text }
}

async function sendReminderEmail(params: {
  apiKey: string
  from: string
  to: string
  firstName: string | null
  tasks: DueTaskRow[]
}): Promise<{ ok: boolean; error?: string }> {
  const { subject, html, text } = renderReminderEmail({
    firstName: params.firstName,
    tasks: params.tasks,
  })

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${params.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: params.from,
        to: [params.to],
        subject,
        html,
        text,
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      return { ok: false, error: `Resend ${res.status}: ${body.slice(0, 300)}` }
    }

    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Unknown fetch error' }
  }
}

Deno.serve(async () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  const fromAddress = Deno.env.get('RESEND_FROM_EMAIL') ?? 'NeuroRoutine <onboarding@resend.dev>'

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
      JSON.stringify({ ok: true, dueDate, remindersPrepared: 0, emailsSent: 0, note: 'No due tasks' }),
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

  // Group due tasks by user first: one email per user per day, not one per task.
  const tasksByUser = new Map<string, DueTaskRow[]>()
  for (const task of tasks) {
    const userId = task.routines?.user_id
    if (!userId) continue

    const pref = prefByUser.get(userId)
    // No stored preference defaults to "reminders on" (matches the table's own DEFAULT true),
    // so a user who never opened the settings panel still gets reminders.
    if (pref && !pref.email_enabled) continue

    const list = tasksByUser.get(userId) ?? []
    list.push(task)
    tasksByUser.set(userId, list)
  }

  const eligibleUserIds = Array.from(tasksByUser.keys())
  let remindersPrepared = 0
  let emailsSent = 0
  const emailErrors: Array<{ user_id: string; error: string }> = []

  for (const userId of eligibleUserIds) {
    const userTasks = tasksByUser.get(userId)!
    for (const task of userTasks) {
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
  }

  // Email sending is optional: without RESEND_API_KEY configured, the function still records
  // reminder_due_task events (useful on its own, and what the pre-provider version already did)
  // instead of failing the whole run.
  if (resendApiKey && eligibleUserIds.length > 0) {
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id,email,first_name')
      .in('id', eligibleUserIds)

    if (!profileError) {
      const profileById = new Map(((profiles ?? []) as ProfileRow[]).map((p) => [p.id, p]))

      for (const userId of eligibleUserIds) {
        const profile = profileById.get(userId)
        if (!profile?.email) continue

        const result = await sendReminderEmail({
          apiKey: resendApiKey,
          from: fromAddress,
          to: profile.email,
          firstName: profile.first_name,
          tasks: tasksByUser.get(userId)!,
        })

        if (result.ok) {
          emailsSent += 1
        } else {
          emailErrors.push({ user_id: userId, error: result.error ?? 'unknown error' })
        }
      }
    }
  }

  return new Response(
    JSON.stringify({
      ok: true,
      dueDate,
      remindersPrepared,
      emailsSent,
      emailProviderConfigured: Boolean(resendApiKey),
      emailErrors: emailErrors.length ? emailErrors : undefined,
    }),
    { headers: { 'Content-Type': 'application/json' } },
  )
})
