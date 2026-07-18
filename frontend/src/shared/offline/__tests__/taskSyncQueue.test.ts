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
})
