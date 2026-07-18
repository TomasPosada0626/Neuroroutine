import 'fake-indexeddb/auto'
import {
  enqueueTaskInsert,
  listQueuedTaskInserts,
  removeQueuedTaskInsert,
} from '../taskSyncQueue'

describe('taskSyncQueue', () => {
  beforeEach(async () => {
    await new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase('nr-offline-db')
      req.onsuccess = () => resolve()
      req.onerror = () => resolve()
      req.onblocked = () => resolve()
    })
  })

  it('enqueues, lists sorted by queued_at, and removes queued inserts', async () => {
    await enqueueTaskInsert({
      local_id: 'b',
      user_id: 'u1',
      routine_id: 'r1',
      title: 'second',
      queued_at: '2026-07-18T11:00:00.000Z',
    })

    await enqueueTaskInsert({
      local_id: 'a',
      user_id: 'u1',
      routine_id: 'r1',
      title: 'first',
      queued_at: '2026-07-18T10:00:00.000Z',
    })

    const listed = await listQueuedTaskInserts()
    expect(listed.map((x) => x.local_id)).toEqual(['a', 'b'])

    await removeQueuedTaskInsert('a')

    const afterRemove = await listQueuedTaskInserts()
    expect(afterRemove.map((x) => x.local_id)).toEqual(['b'])
  })

  it('handles identical queued_at timestamps without throwing', async () => {
    await enqueueTaskInsert({
      local_id: 'same-1',
      user_id: 'u1',
      routine_id: 'r1',
      title: 'first same timestamp',
      queued_at: '2026-07-18T10:00:00.000Z',
    })

    await enqueueTaskInsert({
      local_id: 'same-2',
      user_id: 'u1',
      routine_id: 'r1',
      title: 'second same timestamp',
      queued_at: '2026-07-18T10:00:00.000Z',
    })

    const listed = await listQueuedTaskInserts()
    expect(listed).toHaveLength(2)
    expect(listed.map((x) => x.local_id).sort()).toEqual(['same-1', 'same-2'])
  })

  it('returns empty list and no-ops when indexedDB is missing', async () => {
    const original = globalThis.indexedDB
    // Simulate environments where IndexedDB is unavailable.
    ;(globalThis as { indexedDB?: IDBFactory }).indexedDB = undefined

    await expect(
      enqueueTaskInsert({
        local_id: 'x',
        user_id: 'u1',
        routine_id: 'r1',
        title: 'x',
        queued_at: '2026-07-18T10:00:00.000Z',
      }),
    ).resolves.toBeUndefined()

    await expect(removeQueuedTaskInsert('x')).resolves.toBeUndefined()
    await expect(listQueuedTaskInserts()).resolves.toEqual([])

    ;(globalThis as { indexedDB?: IDBFactory }).indexedDB = original
  })

  it('swallows IndexedDB errors and keeps API resilient', async () => {
    const originalOpen = indexedDB.open.bind(indexedDB)

    const brokenOpen: IDBFactory['open'] = () => {
      const request = {
        result: undefined,
        error: new DOMException('open failed'),
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null,
      } as unknown as IDBOpenDBRequest

      queueMicrotask(() => {
        request.onerror?.call(request, new Event('error'))
      })

      return request
    }

    ;(indexedDB as { open: IDBFactory['open'] }).open = brokenOpen

    await expect(
      enqueueTaskInsert({
        local_id: 'err',
        user_id: 'u1',
        routine_id: 'r1',
        title: 'err',
        queued_at: '2026-07-18T10:00:00.000Z',
      }),
    ).resolves.toBeUndefined()

    await expect(listQueuedTaskInserts()).resolves.toEqual([])
    await expect(removeQueuedTaskInsert('err')).resolves.toBeUndefined()

    ;(indexedDB as { open: IDBFactory['open'] }).open = originalOpen
  })

  it('handles upgrade path when object store already exists', async () => {
    const originalOpen = indexedDB.open.bind(indexedDB)

    const customOpen: IDBFactory['open'] = () => {
      const req = {
        result: {
          objectStoreNames: {
            contains: () => true,
          },
          createObjectStore: vi.fn(),
          close: vi.fn(),
        },
        error: null,
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null,
      } as unknown as IDBOpenDBRequest

      queueMicrotask(() => {
        req.onupgradeneeded?.call(
          req,
          {
            oldVersion: 0,
            newVersion: 1,
          } as IDBVersionChangeEvent,
        )
        req.onsuccess?.call(req, new Event('success'))
      })

      return req
    }

    ;(indexedDB as { open: IDBFactory['open'] }).open = customOpen

    await expect(listQueuedTaskInserts()).resolves.toEqual([])

    ;(indexedDB as { open: IDBFactory['open'] }).open = originalOpen
  })

  it('returns [] when getAll fails in readonly transaction', async () => {
    const originalOpen = indexedDB.open.bind(indexedDB)

    const failingOpen: IDBFactory['open'] = () => {
      const req = {
        result: {
          objectStoreNames: {
            contains: () => true,
          },
          createObjectStore: vi.fn(),
          close: vi.fn(),
          transaction: vi.fn(() => ({
            objectStore: () => ({
              getAll: () => {
                const getReq = {
                  result: null,
                  error: new DOMException('getAll fail'),
                  onsuccess: null,
                  onerror: null,
                } as unknown as IDBRequest

                queueMicrotask(() => {
                  getReq.onerror?.call(getReq, new Event('error'))
                })

                return getReq
              },
            }),
          })),
        },
        error: null,
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null,
      } as unknown as IDBOpenDBRequest

      queueMicrotask(() => {
        req.onsuccess?.call(req, new Event('success'))
      })

      return req
    }

    ;(indexedDB as { open: IDBFactory['open'] }).open = failingOpen

    await expect(listQueuedTaskInserts()).resolves.toEqual([])

    ;(indexedDB as { open: IDBFactory['open'] }).open = originalOpen
  })
})
