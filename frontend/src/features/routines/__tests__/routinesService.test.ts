type MockResult = {
  data?: unknown
  error?: unknown
}

type MockChain = {
  select: ReturnType<typeof vi.fn>
  order: ReturnType<typeof vi.fn>
  textSearch: ReturnType<typeof vi.fn>
  ilike: ReturnType<typeof vi.fn>
  insert: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
  eq: ReturnType<typeof vi.fn>
  limit: ReturnType<typeof vi.fn>
  gte: ReturnType<typeof vi.fn>
  single: ReturnType<typeof vi.fn>
}

function makeChain(result: MockResult): MockChain {
  const chain = {
    select: vi.fn(() => chain),
    order: vi.fn(async () => result),
    textSearch: vi.fn(() => chain),
    ilike: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    delete: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    gte: vi.fn(() => chain),
    single: vi.fn(async () => result),
  }

  return chain
}

const fromQueue: MockChain[] = []
const rpcQueue: MockResult[] = []

vi.mock('@/shared/api', () => {
  return {
    supabase: {
      rpc: vi.fn(async () => {
        return rpcQueue.shift() ?? { data: null, error: new Error('Missing mocked supabase.rpc() result') }
      }),
      from: vi.fn(() => {
        const next = fromQueue.shift()
        if (!next) throw new Error('Missing mocked supabase.from() chain')
        return next
      }),
    },
  }
})

import {
  createRoutine,
  createTask,
  deleteRoutine,
  deleteTask,
  listAllTasks,
  listRoutines,
  listTaskEvents,
  listTasks,
  searchRoutines,
  toggleTaskDone,
  updateRoutine,
} from '../routinesService'

describe('routinesService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fromQueue.length = 0
    rpcQueue.length = 0
  })

  it('listRoutines returns ordered data', async () => {
    fromQueue.push(
      makeChain({
        data: [{ id: 'r1', title: 'Morning' }],
        error: null,
      }),
    )

    const data = await listRoutines()

    expect(data).toHaveLength(1)
    expect(data[0]?.id).toBe('r1')
  })

  it('listRoutines throws when Supabase returns an error', async () => {
    fromQueue.push(
      makeChain({
        data: null,
        error: new Error('db fail'),
      }),
    )

    await expect(listRoutines()).rejects.toThrow('db fail')
  })

  it('searchRoutines uses text search when available', async () => {
    rpcQueue.push({ data: null, error: new Error('rpc not available') })
    const queryChain = makeChain({
      data: [{ id: 'r1', title: 'Morning Focus' }],
      error: null,
    })
    fromQueue.push(queryChain)

    const data = await searchRoutines('focus')

    expect(data).toHaveLength(1)
    expect(queryChain.textSearch).toHaveBeenCalled()
    expect(queryChain.ilike).not.toHaveBeenCalled()
  })

  it('searchRoutines falls back to ilike when text search errors', async () => {
    rpcQueue.push({ data: null, error: new Error('rpc not available') })
    const first = makeChain({ data: null, error: new Error('fts missing') })
    const fallback = makeChain({
      data: [{ id: 'r2', title: 'Focus fallback' }],
      error: null,
    })
    fromQueue.push(first, fallback)

    const data = await searchRoutines('focus fallback')

    expect(data).toHaveLength(1)
    expect(first.textSearch).toHaveBeenCalled()
    expect(fallback.ilike).toHaveBeenCalledWith('title', '%focus fallback%')
  })

  it('searchRoutines uses RPC result when available', async () => {
    rpcQueue.push({
      data: [{ id: 'r3', title: 'RPC routine' }],
      error: null,
    })

    const data = await searchRoutines('rpc routine')

    expect(data).toHaveLength(1)
    expect(data[0]?.id).toBe('r3')
    expect(fromQueue).toHaveLength(0)
  })

  it('createTask returns base insert result when no metadata is provided', async () => {
    const insert = makeChain({
      data: {
        id: 't1',
        user_id: 'u1',
        routine_id: 'r1',
        title: 'Task',
      },
      error: null,
    })
    fromQueue.push(insert)

    const created = await createTask({
      user_id: 'u1',
      routine_id: 'r1',
      title: 'Task',
    })

    expect(created.id).toBe('t1')
    expect(fromQueue).toHaveLength(0)
  })

  it('createTask updates metadata when provided and returns updated row', async () => {
    const insert = makeChain({
      data: {
        id: 't3',
        user_id: 'u1',
        routine_id: 'r1',
        title: 'Task with update',
      },
      error: null,
    })
    const update = makeChain({
      data: {
        id: 't3',
        user_id: 'u1',
        routine_id: 'r1',
        title: 'Task with update',
        description: 'desc',
        due_date: '2026-07-18',
        due_time: '09:30',
      },
      error: null,
    })
    fromQueue.push(insert, update)

    const created = await createTask({
      user_id: 'u1',
      routine_id: 'r1',
      title: 'Task with update',
      description: ' desc ',
      due_date: '2026-07-18',
      due_time: '09:30',
    })

    expect(created.id).toBe('t3')
    expect((created as { description?: string }).description).toBe('desc')
    expect(update.update).toHaveBeenCalled()
  })

  it('createTask throws when initial insert fails', async () => {
    const insert = makeChain({
      data: null,
      error: new Error('insert fail'),
    })
    fromQueue.push(insert)

    await expect(
      createTask({
        user_id: 'u1',
        routine_id: 'r1',
        title: 'Broken task',
      }),
    ).rejects.toThrow('insert fail')
  })

  it('createTask falls back to base task when metadata update fails', async () => {
    const insert = makeChain({
      data: {
        id: 't2',
        user_id: 'u1',
        routine_id: 'r1',
        title: 'Task with meta',
      },
      error: null,
    })
    const update = makeChain({ data: null, error: new Error('column missing') })
    fromQueue.push(insert, update)

    const created = await createTask({
      user_id: 'u1',
      routine_id: 'r1',
      title: 'Task with meta',
      description: 'desc',
      due_date: '2026-07-17',
      due_time: '10:00:00',
    })

    expect(created.id).toBe('t2')
    expect(update.update).toHaveBeenCalled()
  })

  it('createRoutine inserts a routine and returns it', async () => {
    const insert = makeChain({
      data: {
        id: 'r10',
        user_id: 'u1',
        title: 'Routine',
        notes: null,
      },
      error: null,
    })
    fromQueue.push(insert)

    const routine = await createRoutine({ user_id: 'u1', title: 'Routine' })

    expect(routine.id).toBe('r10')
    expect(insert.insert).toHaveBeenCalledWith({ user_id: 'u1', title: 'Routine', notes: null })
  })

  it('updateRoutine updates by id and returns row', async () => {
    const update = makeChain({
      data: {
        id: 'r11',
        user_id: 'u1',
        title: 'Updated',
        notes: 'n',
      },
      error: null,
    })
    fromQueue.push(update)

    const routine = await updateRoutine({ id: 'r11', title: 'Updated', notes: 'n' })

    expect(routine.id).toBe('r11')
    expect(update.eq).toHaveBeenCalledWith('id', 'r11')
  })

  it('deleteRoutine deletes by id', async () => {
    const chain = makeChain({ data: null, error: null })
    fromQueue.push(chain)

    await expect(deleteRoutine('r12')).resolves.toBeUndefined()
    expect(chain.eq).toHaveBeenCalledWith('id', 'r12')
  })

  it('listTasks and listAllTasks return arrays from Supabase', async () => {
    const listByRoutine = makeChain({
      data: [{ id: 'tA', routine_id: 'r1' }],
      error: null,
    })
    const listEverywhere = makeChain({
      data: [{ id: 'tB', routine_id: 'r2' }],
      error: null,
    })
    fromQueue.push(listByRoutine, listEverywhere)

    const tasks = await listTasks('r1')
    const all = await listAllTasks()

    expect(tasks[0]?.id).toBe('tA')
    expect(all[0]?.id).toBe('tB')
    expect(listByRoutine.eq).toHaveBeenCalledWith('routine_id', 'r1')
  })

  it('listTaskEvents applies limit and optional since filter', async () => {
    const noSince = makeChain({ data: [], error: null })
    noSince.order = vi.fn(() => noSince)
    noSince.limit = vi.fn(async () => ({ data: [{ id: 'e1' }], error: null }))
    noSince.gte = vi.fn(async () => ({ data: [{ id: 'never' }], error: null }))

    const withSince = makeChain({ data: [], error: null })
    withSince.order = vi.fn(() => withSince)
    withSince.limit = vi.fn(() => withSince)
    withSince.gte = vi.fn(async () => ({ data: [{ id: 'e2' }], error: null }))

    fromQueue.push(noSince, withSince)

    const res1 = await listTaskEvents({ limit: 10 })
    const res2 = await listTaskEvents({ since: '2026-07-01T00:00:00.000Z', limit: 5 })

    expect(res1[0]?.id).toBe('e1')
    expect(res2[0]?.id).toBe('e2')
    expect(noSince.limit).toHaveBeenCalledWith(10)
    expect(noSince.gte).not.toHaveBeenCalled()
    expect(withSince.limit).toHaveBeenCalledWith(5)
    expect(withSince.gte).toHaveBeenCalledWith('created_at', '2026-07-01T00:00:00.000Z')
  })

  it('toggleTaskDone and deleteTask call expected filters', async () => {
    const toggle = makeChain({
      data: {
        id: 't99',
        is_done: true,
      },
      error: null,
    })
    const del = makeChain({ data: null, error: null })
    fromQueue.push(toggle, del)

    const updated = await toggleTaskDone({ id: 't99', is_done: true })
    await deleteTask('t99')

    expect(updated.id).toBe('t99')
    expect(toggle.eq).toHaveBeenCalledWith('id', 't99')
    expect(del.eq).toHaveBeenCalledWith('id', 't99')
  })

  it('propagates errors for listTaskEvents, toggleTaskDone and deleteTask', async () => {
    const eventsFail = makeChain({ data: null, error: null })
    eventsFail.order = vi.fn(() => eventsFail)
    eventsFail.limit = vi.fn(async () => ({ data: null, error: new Error('events fail') }))
    eventsFail.gte = vi.fn(async () => ({ data: null, error: new Error('events fail') }))

    const deleteFail = {
      select: vi.fn(() => deleteFail),
      order: vi.fn(async () => ({ data: null, error: null })),
      textSearch: vi.fn(() => deleteFail),
      ilike: vi.fn(() => deleteFail),
      insert: vi.fn(() => deleteFail),
      update: vi.fn(() => deleteFail),
      delete: vi.fn(() => deleteFail),
      eq: vi.fn(async () => ({ data: null, error: new Error('delete fail') })),
      limit: vi.fn(() => deleteFail),
      gte: vi.fn(() => deleteFail),
      single: vi.fn(async () => ({ data: null, error: null })),
    }

    fromQueue.push(
      eventsFail,
      makeChain({ data: null, error: new Error('toggle fail') }),
      deleteFail,
    )

    await expect(listTaskEvents()).rejects.toThrow('events fail')
    await expect(toggleTaskDone({ id: 't1', is_done: false })).rejects.toThrow('toggle fail')
    await expect(deleteTask('t1')).rejects.toThrow('delete fail')
  })
})
