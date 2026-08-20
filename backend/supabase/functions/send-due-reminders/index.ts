import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export type DueTaskRow = {
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

// Exported (not just used by Deno.serve below) so index.test.ts can test these directly —
// they're plain functions with no Deno-specific APIs, the one part of this file that's
// meaningfully unit-testable outside a running Supabase project.
export function todayYmd() {
  return new Date().toISOString().slice(0, 10)
}

// Deno/browser Intl can format the midnight hour as "24" instead of "0" for some locale/option
// combinations - normalize with modulo rather than assume either behavior.
export function getHourInTimezone(now: Date, timezone: string): number {
  try {
    const hourStr = new Intl.DateTimeFormat('en-GB', {
      hour: 'numeric',
      hour12: false,
      timeZone: timezone,
    }).format(now)
    return Number(hourStr) % 24
  } catch {
    // An invalid/unrecognized IANA timezone string (e.g. stale or hand-edited data) shouldn't
    // crash the whole run - fall back to UTC rather than skip the user's reminder outright.
    return now.getUTCHours()
  }
}

export function isReminderHourNow(reminderHour: number, timezone: string, now: Date): boolean {
  return getHourInTimezone(now, timezone) === reminderHour
}

// Constant-time comparison so an attacker probing the Authorization header can't use response
// timing to learn the service-role key one byte at a time.
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

// Runs async tasks with a concurrency cap instead of either fully sequential (was the previous
// behavior for both app_events inserts and Resend calls - fine at a handful of users, but risks
// this Edge Function's own execution time limit as the user count grows, since every send waits
// for the previous one to finish) or fully parallel (a burst of hundreds of simultaneous requests
// against Resend's/Supabase's own rate limits). Exported so index.test.ts can verify the
// concurrency cap and that results come back in the original order.
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let nextIndex = 0

  async function worker() {
    for (;;) {
      const current = nextIndex
      nextIndex += 1
      if (current >= items.length) return
      results[current] = await fn(items[current])
    }
  }

  const workers = Array.from({ length: Math.min(Math.max(limit, 1), items.length) }, () => worker())
  await Promise.all(workers)
  return results
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function renderReminderEmail(params: { firstName: string | null; tasks: DueTaskRow[] }): {
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

async function postResendEmail(params: {
  apiKey: string
  from: string
  to: string
  subject: string
  html?: string
  text: string
}): Promise<{ ok: boolean; error?: string }> {
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
        subject: params.subject,
        ...(params.html ? { html: params.html } : {}),
        text: params.text,
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

export async function sendReminderEmail(params: {
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

  return postResendEmail({ apiKey: params.apiKey, from: params.from, to: params.to, subject, html, text })
}

// Turns a silent field in this function's JSON response (emailErrors) into an active
// notification: previously nothing ever read that field unless someone happened to check the
// invocation logs, so a run where every single email failed looked identical to a fully
// successful one from the outside. Reuses Resend (already configured, zero extra cost/setup)
// instead of adding a Sentry SDK dependency just for this one alert. Best-effort: never let a
// failure sending the alert itself fail the whole run.
export async function sendReminderFailureAlert(params: {
  apiKey: string
  from: string
  to: string
  dueDate: string
  emailErrors: Array<{ user_id: string; error: string }>
}): Promise<{ ok: boolean; error?: string }> {
  const lines = params.emailErrors.map((e) => `- ${e.user_id}: ${e.error}`).join('\n')
  return postResendEmail({
    apiKey: params.apiKey,
    from: params.from,
    to: params.to,
    subject: `send-due-reminders: ${params.emailErrors.length} reminder email(s) failed (${params.dueDate})`,
    text: `The following reminder emails failed to send for ${params.dueDate}:\n\n${lines}`,
  })
}

// Guarded so index.test.ts can `import` this module for the pure helpers above without also
// starting an HTTP server (Deno.serve binds a port immediately at call time, as a module-level
// side effect) — the Supabase Edge Functions runtime loads this file directly as the entry
// point, where import.meta.main is true, so real deployments are unaffected.
if (import.meta.main) {
  Deno.serve(handleRequest)
}

async function handleRequest(req: Request): Promise<Response> {
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

  // Supabase's platform JWT verification (verify_jwt) accepts ANY validly-signed project JWT,
  // which includes the public anon key shipped in every deployed page - it does not by itself
  // restrict this endpoint to the pg_cron trigger. The cron job (migration 0012) already sends
  // the service-role key as its bearer token, so require that same value here: only the caller
  // who actually holds the service-role secret (the cron job, via Vault) can trigger real sends.
  const authHeader = req.headers.get('Authorization') ?? ''
  const callerToken = authHeader.match(/^Bearer (.+)$/)?.[1] ?? ''
  if (!timingSafeEqual(callerToken, serviceRole)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
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

  // supabase-js can't infer the `!inner` join's cardinality from a raw select string (it's
  // conservatively typed as an array), but this FK is many-to-one (each task has exactly one
  // routine), so the response shape really is a single nested object, not an array. Double-cast
  // through `unknown` to be explicit that this override is intentional, not a missed type.
  const tasks = (dueTasks ?? []) as unknown as DueTaskRow[]
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
  const now = new Date()
  const tasksByUser = new Map<string, DueTaskRow[]>()
  for (const task of tasks) {
    const userId = task.routines?.user_id
    if (!userId) continue

    const pref = prefByUser.get(userId)
    // No stored preference defaults to "reminders on" at 08:00 UTC (matches the table's own
    // DEFAULTs), so a user who never opened the settings panel still gets reminders.
    const emailEnabled = pref ? pref.email_enabled : true
    if (!emailEnabled) continue

    const reminderHour = pref ? pref.reminder_hour : 8
    const timezone = pref ? pref.timezone : 'UTC'
    // This function is scheduled hourly (see 0012_hourly_reminder_schedule.sql) specifically so
    // this check can gate on the user's own configured hour instead of emailing everyone at one
    // fixed UTC time regardless of what they set in the reminders settings screen.
    if (!isReminderHourNow(reminderHour, timezone, now)) continue

    const list = tasksByUser.get(userId) ?? []
    list.push(task)
    tasksByUser.set(userId, list)
  }

  const eligibleUserIds = Array.from(tasksByUser.keys())
  let remindersPrepared = 0
  let emailsSent = 0
  const emailErrors: Array<{ user_id: string; error: string }> = []

  // Single batched insert instead of one INSERT per task: with N due tasks across many users this
  // was previously N sequential round-trips to Postgres. A single multi-row insert is one
  // statement, either all rows land or none do (default single-statement atomicity), so
  // remindersPrepared is simply the row count on success.
  const eventRows = eligibleUserIds.flatMap((userId) =>
    tasksByUser.get(userId)!.map((task) => ({
      user_id: userId,
      event_name: 'reminder_due_task',
      routine_task_id: task.id,
      meta: {
        due_date: task.due_date,
        task_title: task.title,
        routine_title: task.routines?.title ?? null,
      },
    })),
  )

  if (eventRows.length > 0) {
    const { error: eventError } = await supabase.from('app_events').insert(eventRows)
    if (!eventError) remindersPrepared = eventRows.length
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
      const recipients = eligibleUserIds
        .map((userId) => ({ userId, profile: profileById.get(userId) }))
        .filter((r): r is { userId: string; profile: ProfileRow } => Boolean(r.profile?.email))

      // Cap at 5 concurrent Resend calls: previously fully sequential (one await per user), which
      // scales linearly with user count and risks this function's own execution time limit.
      const results = await mapWithConcurrency(recipients, 5, async ({ userId, profile }) => {
        const result = await sendReminderEmail({
          apiKey: resendApiKey,
          from: fromAddress,
          to: profile.email,
          firstName: profile.first_name,
          tasks: tasksByUser.get(userId)!,
        })
        return { userId, result }
      })

      for (const { userId, result } of results) {
        if (result.ok) {
          emailsSent += 1
        } else {
          emailErrors.push({ user_id: userId, error: result.error ?? 'unknown error' })
        }
      }
    }
  }

  if (emailErrors.length > 0) {
    const alertEmail = Deno.env.get('ALERT_EMAIL')
    if (resendApiKey && alertEmail) {
      await sendReminderFailureAlert({
        apiKey: resendApiKey,
        from: fromAddress,
        to: alertEmail,
        dueDate,
        emailErrors,
      }).catch(() => {
        // Alerting is best-effort: never fail the whole run because the alert itself couldn't send.
      })
    } else {
      console.error(
        `send-due-reminders: ${emailErrors.length} email(s) failed to send for ${dueDate} and no ` +
          'ALERT_EMAIL is configured to notify — see emailErrors in this run\'s response/logs.',
      )
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
}
