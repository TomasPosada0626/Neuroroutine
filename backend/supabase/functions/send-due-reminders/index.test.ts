import { assertEquals, assertMatch, assertStringIncludes } from 'jsr:@std/assert@1'
import {
  escapeHtml,
  getHourInTimezone,
  isReminderHourNow,
  mapWithConcurrency,
  renderReminderEmail,
  sendReminderEmail,
  sendReminderFailureAlert,
  timingSafeEqual,
  todayYmd,
  type DueTaskRow,
} from './index.ts'

function task(overrides: Partial<DueTaskRow> = {}): DueTaskRow {
  return {
    id: 't1',
    title: 'Tomar agua',
    due_date: '2026-07-27',
    routines: { user_id: 'u1', title: 'Mañana enfocada' },
    ...overrides,
  }
}

Deno.test('todayYmd returns a YYYY-MM-DD string', () => {
  assertMatch(todayYmd(), /^\d{4}-\d{2}-\d{2}$/)
})

Deno.test('escapeHtml escapes all five reserved characters', () => {
  assertEquals(escapeHtml(`<b>"Tom's" & co</b>`), '&lt;b&gt;&quot;Tom&#39;s&quot; &amp; co&lt;/b&gt;')
})

Deno.test('escapeHtml leaves plain text untouched', () => {
  assertEquals(escapeHtml('Tomar agua'), 'Tomar agua')
})

Deno.test('timingSafeEqual: true for identical strings', () => {
  assertEquals(timingSafeEqual('service-role-secret', 'service-role-secret'), true)
})

Deno.test('timingSafeEqual: false for different strings of the same length', () => {
  assertEquals(timingSafeEqual('service-role-secret', 'service-role-secreX'), false)
})

Deno.test('timingSafeEqual: false for different lengths (never index out of bounds)', () => {
  assertEquals(timingSafeEqual('short', 'a-much-longer-value'), false)
})

Deno.test('timingSafeEqual: empty caller token never matches a real secret', () => {
  assertEquals(timingSafeEqual('', 'service-role-secret'), false)
})

Deno.test('renderReminderEmail: singular subject for exactly one task', () => {
  const { subject } = renderReminderEmail({ firstName: 'Tomas', tasks: [task()] })
  assertEquals(subject, 'Tienes 1 tarea pendiente para hoy en NeuroRoutine')
})

Deno.test('renderReminderEmail: plural subject for multiple tasks', () => {
  const { subject } = renderReminderEmail({
    firstName: 'Tomas',
    tasks: [task({ id: 't1' }), task({ id: 't2' })],
  })
  assertEquals(subject, 'Tienes 2 tareas pendientes para hoy en NeuroRoutine')
})

Deno.test('renderReminderEmail: greets by first name when present', () => {
  const { html, text } = renderReminderEmail({ firstName: 'Tomas', tasks: [task()] })
  assertStringIncludes(html, 'Hola Tomas,')
  assertStringIncludes(text, 'Hola Tomas,')
})

Deno.test('renderReminderEmail: falls back to a generic greeting without a first name', () => {
  const { html, text } = renderReminderEmail({ firstName: null, tasks: [task()] })
  assertStringIncludes(html, 'Hola hola,')
  assertStringIncludes(text, 'Hola hola,')
})

Deno.test('renderReminderEmail: falls back to a generic greeting for a blank first name', () => {
  const { html } = renderReminderEmail({ firstName: '   ', tasks: [task()] })
  assertStringIncludes(html, 'Hola hola,')
})

Deno.test('renderReminderEmail: HTML-escapes task and routine titles', () => {
  const { html } = renderReminderEmail({
    firstName: null,
    tasks: [task({ title: '<script>alert(1)</script>', routines: { user_id: 'u1', title: 'A & B' } })],
  })
  assertStringIncludes(html, '&lt;script&gt;alert(1)&lt;/script&gt;')
  assertStringIncludes(html, 'A &amp; B')
  assertEquals(html.includes('<script>alert(1)</script>'), false)
})

Deno.test('renderReminderEmail: omits the routine suffix when there is no routine', () => {
  const { html, text } = renderReminderEmail({
    firstName: null,
    tasks: [task({ routines: null })],
  })
  assertStringIncludes(html, '<li>Tomar agua</li>')
  assertStringIncludes(text, '- Tomar agua\n')
})

Deno.test('renderReminderEmail: lists every task in both html and text', () => {
  const { html, text } = renderReminderEmail({
    firstName: null,
    tasks: [task({ id: 't1', title: 'Tarea A' }), task({ id: 't2', title: 'Tarea B' })],
  })
  assertStringIncludes(html, 'Tarea A')
  assertStringIncludes(html, 'Tarea B')
  assertStringIncludes(text, '- Tarea A')
  assertStringIncludes(text, '- Tarea B')
})

Deno.test('getHourInTimezone: reads the hour in UTC', () => {
  assertEquals(getHourInTimezone(new Date('2026-01-15T12:00:00Z'), 'UTC'), 12)
})

Deno.test('getHourInTimezone: converts to a non-UTC timezone', () => {
  // No DST in January for either zone, so these offsets are stable year-round for this test.
  assertEquals(getHourInTimezone(new Date('2026-01-15T12:00:00Z'), 'America/New_York'), 7)
  assertEquals(getHourInTimezone(new Date('2026-01-15T12:00:00Z'), 'Asia/Tokyo'), 21)
})

Deno.test('getHourInTimezone: normalizes midnight to 0, not 24', () => {
  assertEquals(getHourInTimezone(new Date('2026-01-15T00:00:00Z'), 'UTC'), 0)
})

Deno.test('getHourInTimezone: falls back to UTC for an invalid timezone string', () => {
  assertEquals(
    getHourInTimezone(new Date('2026-01-15T12:00:00Z'), 'Not/A_Real_Zone'),
    new Date('2026-01-15T12:00:00Z').getUTCHours(),
  )
})

Deno.test('isReminderHourNow: true only during the matching hour', () => {
  const now = new Date('2026-01-15T09:00:00Z')
  assertEquals(isReminderHourNow(9, 'UTC', now), true)
  assertEquals(isReminderHourNow(8, 'UTC', now), false)
  assertEquals(isReminderHourNow(10, 'UTC', now), false)
})

Deno.test('isReminderHourNow: matches per-user timezone, not UTC', () => {
  // 12:00 UTC is 07:00 in America/New_York (no DST in January).
  const now = new Date('2026-01-15T12:00:00Z')
  assertEquals(isReminderHourNow(7, 'America/New_York', now), true)
  assertEquals(isReminderHourNow(12, 'America/New_York', now), false)
})

Deno.test('sendReminderEmail: posts to Resend with the rendered content and returns ok on success', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = []
  const originalFetch = globalThis.fetch
  globalThis.fetch = ((url: string, init?: RequestInit) => {
    calls.push({ url, init })
    return Promise.resolve(new Response(null, { status: 200 }))
  }) as typeof fetch

  try {
    const result = await sendReminderEmail({
      apiKey: 're_test_key',
      from: 'NeuroRoutine <onboarding@resend.dev>',
      to: 'tomas@example.com',
      firstName: 'Tomas',
      tasks: [task()],
    })

    assertEquals(result, { ok: true })
    assertEquals(calls.length, 1)
    assertEquals(calls[0].url, 'https://api.resend.com/emails')
    assertEquals(calls[0].init?.method, 'POST')
    const headers = calls[0].init?.headers as Record<string, string>
    assertEquals(headers.Authorization, 'Bearer re_test_key')

    const body = JSON.parse(calls[0].init?.body as string)
    assertEquals(body.to, ['tomas@example.com'])
    assertEquals(body.from, 'NeuroRoutine <onboarding@resend.dev>')
    assertStringIncludes(body.subject, 'Tienes 1 tarea pendiente')
  } finally {
    globalThis.fetch = originalFetch
  }
})

Deno.test('sendReminderEmail: returns ok:false with the response body on a non-2xx status', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (() =>
    Promise.resolve(new Response('rate limited', { status: 429 }))) as typeof fetch

  try {
    const result = await sendReminderEmail({
      apiKey: 're_test_key',
      from: 'from@example.com',
      to: 'to@example.com',
      firstName: null,
      tasks: [task()],
    })

    assertEquals(result.ok, false)
    assertStringIncludes(result.error ?? '', 'Resend 429')
    assertStringIncludes(result.error ?? '', 'rate limited')
  } finally {
    globalThis.fetch = originalFetch
  }
})

Deno.test('sendReminderEmail: returns ok:false instead of throwing when fetch itself rejects', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (() => Promise.reject(new Error('network down'))) as typeof fetch

  try {
    const result = await sendReminderEmail({
      apiKey: 're_test_key',
      from: 'from@example.com',
      to: 'to@example.com',
      firstName: null,
      tasks: [task()],
    })

    assertEquals(result, { ok: false, error: 'network down' })
  } finally {
    globalThis.fetch = originalFetch
  }
})

Deno.test('mapWithConcurrency: results preserve input order regardless of completion order', async () => {
  const items = [30, 10, 20]
  const results = await mapWithConcurrency(items, 3, (ms) => {
    return new Promise<number>((resolve) => setTimeout(() => resolve(ms), ms))
  })
  assertEquals(results, [30, 10, 20])
})

Deno.test('mapWithConcurrency: never runs more than `limit` tasks at once', async () => {
  let active = 0
  let maxActive = 0
  const items = Array.from({ length: 10 }, (_, i) => i)

  await mapWithConcurrency(items, 3, async () => {
    active += 1
    maxActive = Math.max(maxActive, active)
    await new Promise((resolve) => setTimeout(resolve, 5))
    active -= 1
  })

  assertEquals(maxActive <= 3, true)
})

Deno.test('mapWithConcurrency: empty input resolves to an empty array', async () => {
  const results = await mapWithConcurrency<number, number>([], 5, (n) => Promise.resolve(n))
  assertEquals(results, [])
})

Deno.test('sendReminderFailureAlert: posts a summary of every failed send to Resend', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = []
  const originalFetch = globalThis.fetch
  globalThis.fetch = ((url: string, init?: RequestInit) => {
    calls.push({ url, init })
    return Promise.resolve(new Response(null, { status: 200 }))
  }) as typeof fetch

  try {
    const result = await sendReminderFailureAlert({
      apiKey: 're_test_key',
      from: 'NeuroRoutine <onboarding@resend.dev>',
      to: 'ops@example.com',
      dueDate: '2026-08-20',
      emailErrors: [{ user_id: 'u1', error: 'Resend 429: rate limited' }],
    })

    assertEquals(result, { ok: true })
    assertEquals(calls[0].url, 'https://api.resend.com/emails')
    const body = JSON.parse(calls[0].init?.body as string)
    assertEquals(body.to, ['ops@example.com'])
    assertStringIncludes(body.subject, '1 reminder email(s) failed')
    assertStringIncludes(body.text, 'u1')
    assertStringIncludes(body.text, 'Resend 429: rate limited')
  } finally {
    globalThis.fetch = originalFetch
  }
})
