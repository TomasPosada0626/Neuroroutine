import { beforeEach, describe, expect, it, vi } from 'vitest'

type MockResult = {
  data?: unknown
  error?: unknown
}

function makeChain(result: MockResult) {
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

const fromQueue: Array<ReturnType<typeof makeChain>> = []
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

import { createTask, listRoutines, searchRoutines } from '../routinesService'

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
})
