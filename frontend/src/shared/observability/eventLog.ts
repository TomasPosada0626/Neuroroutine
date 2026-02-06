import { supabase } from '@/shared/api'

export type AppEventName =
  | 'routine_created'
  | 'routine_deleted'
  | 'task_created'
  | 'tasks_created_bulk'
  | 'task_completed'
  | 'task_uncompleted'
  | 'task_deleted'

type AppEventInsert = {
  user_id: string
  event_name: AppEventName
  routine_id?: string | null
  routine_task_id?: string | null
  meta?: Record<string, unknown> | null
}

const BLOCKED_META_KEYS = /title|description|email|username|first_name|last_name|password/i

function sanitizeMeta(meta: Record<string, unknown> | null | undefined) {
  if (!meta) return {}
  const out: Record<string, unknown> = {}
  let count = 0

  for (const [key, value] of Object.entries(meta)) {
    if (!key || BLOCKED_META_KEYS.test(key)) continue
    if (count >= 20) break

    if (typeof value === 'number' && Number.isFinite(value)) {
      out[key] = value
      count++
      continue
    }

    if (typeof value === 'boolean') {
      out[key] = value
      count++
      continue
    }

    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (!trimmed) continue
      if (trimmed.length > 80) continue
      out[key] = trimmed
      count++
      continue
    }
  }

  return out
}

export async function logAppEvent(event: AppEventInsert) {
  try {
    const meta = sanitizeMeta(event.meta)
    const { error } = await supabase.from('app_events').insert({
      user_id: event.user_id,
      event_name: event.event_name,
      routine_id: event.routine_id ?? null,
      routine_task_id: event.routine_task_id ?? null,
      meta,
    })

    if (error) {
      // Best-effort only; missing table / RLS / offline should never break UX.
      return false
    }

    return true
  } catch {
    return false
  }
}
