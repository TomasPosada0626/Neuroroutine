import { assertEquals, assertMatch, assertStringIncludes } from 'jsr:@std/assert@1'
import { escapeHtml, renderReminderEmail, sendReminderEmail, todayYmd, type DueTaskRow } from './index.ts'

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
