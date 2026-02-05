import type { Session, User } from '@supabase/supabase-js'
import { create } from 'zustand'
import { supabase } from '@/shared/api'

type AuthState = {
  loading: boolean
  session: Session | null
  user: User | null

  init: () => Promise<() => void>
  signInWithPassword: (email: string, password: string) => Promise<void>
  signUpWithPassword: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  loading: true,
  session: null,
  user: null,

  init: async () => {
    set({ loading: true })
    const { data } = await supabase.auth.getSession()
    set({ session: data.session, user: data.session?.user ?? null, loading: false })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null })
    })

    return () => listener.subscription.unsubscribe()
  },

  signInWithPassword: async (email, password) => {
    set({ loading: true })
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    set({ loading: false })
    if (error) throw error
  },

  signUpWithPassword: async (email, password) => {
    set({ loading: true })
    const { error } = await supabase.auth.signUp({ email, password })
    set({ loading: false })
    if (error) throw error
  },

  signOut: async () => {
    set({ loading: true })
    const { error } = await supabase.auth.signOut()
    set({ loading: false, session: null, user: null })
    if (error) throw error
  },
}))

export function useAuth() {
  return useAuthStore()
}
