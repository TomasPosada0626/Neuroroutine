import { create } from 'zustand'
import { fetchNrSchemaStatus, type NrSchemaStatus } from './schemaService'

type SchemaState = {
  loading: boolean
  status: NrSchemaStatus | null
  error: string | null
  lastCheckedAt: string | null
  hydrateFromCache: () => void
  refresh: () => Promise<void>
}

const CACHE_KEY = 'nr-schema-status-v1'

export const useSchemaStore = create<SchemaState>((set, get) => ({
  loading: false,
  status: null,
  error: null,
  lastCheckedAt: null,

  hydrateFromCache: () => {
    try {
      const raw = localStorage.getItem(CACHE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as { ts?: string; status?: NrSchemaStatus }
      if (parsed && typeof parsed.ts === 'string' && parsed.status) {
        set({ status: parsed.status, lastCheckedAt: parsed.ts })
      }
    } catch {
      // ignore
    }
  },

  refresh: async () => {
    if (get().loading) return
    set({ loading: true, error: null })

    try {
      const status = await fetchNrSchemaStatus()
      const ts = new Date().toISOString()
      set({ status, lastCheckedAt: ts })

      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ ts, status }))
      } catch {
        // ignore
      }
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Schema check failed' })
    } finally {
      set({ loading: false })
    }
  },
}))
