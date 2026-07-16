import { describe, expect, it, vi } from 'vitest'

vi.mock('../schemaService', () => {
  return {
    fetchNrSchemaStatus: vi.fn(),
  }
})

async function freshStore() {
  vi.resetModules()
  vi.clearAllMocks()
  localStorage.clear()
  const storeMod = await import('../schemaStore')
  const serviceMod = await import('../schemaService')
  return { storeMod, serviceMod }
}

describe('useSchemaStore', () => {
  it('hydrateFromCache restores cached schema status', async () => {
    const cached = {
      ts: '2026-07-16T10:00:00.000Z',
      status: {
        version: 3,
        task_metadata: { description: true, due_date: true, due_time: false },
        has_app_events: true,
      },
    }

    localStorage.setItem('nr-schema-status-v1', JSON.stringify(cached))

    vi.resetModules()
    const { useSchemaStore } = await import('../schemaStore')

    useSchemaStore.getState().hydrateFromCache()

    expect(useSchemaStore.getState().lastCheckedAt).toBe(cached.ts)
    expect(useSchemaStore.getState().status).toEqual(cached.status)
  })

  it('hydrateFromCache ignores malformed cache', async () => {
    const { storeMod } = await freshStore()
    const { useSchemaStore } = storeMod

    localStorage.setItem('nr-schema-status-v1', '{broken-json')

    expect(() => useSchemaStore.getState().hydrateFromCache()).not.toThrow()
    expect(useSchemaStore.getState().status).toBeNull()
    expect(useSchemaStore.getState().lastCheckedAt).toBeNull()
  })

  it('refresh stores latest status and timestamp', async () => {
    const { storeMod, serviceMod } = await freshStore()
    const { useSchemaStore } = storeMod

    const fetchMock = vi.mocked(serviceMod.fetchNrSchemaStatus)
    fetchMock.mockResolvedValue({
      version: 5,
      task_metadata: { description: true, due_date: true, due_time: true },
      has_app_events: true,
    })

    await useSchemaStore.getState().refresh()

    const state = useSchemaStore.getState()
    expect(state.loading).toBe(false)
    expect(state.error).toBeNull()
    expect(state.status?.version).toBe(5)
    expect(state.lastCheckedAt).not.toBeNull()
    expect(localStorage.getItem('nr-schema-status-v1')).not.toBeNull()
  })

  it('refresh is guarded when already loading', async () => {
    const { storeMod, serviceMod } = await freshStore()
    const { useSchemaStore } = storeMod

    const fetchMock = vi.mocked(serviceMod.fetchNrSchemaStatus)
    useSchemaStore.setState({ loading: true })

    await useSchemaStore.getState().refresh()

    expect(fetchMock).not.toHaveBeenCalled()
  })
})
