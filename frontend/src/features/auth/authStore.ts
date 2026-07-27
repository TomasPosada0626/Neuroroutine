import type { Session, User } from '@supabase/supabase-js';
import { create } from 'zustand';
import { supabase } from '@/shared/api';
import { logAppEvent } from '@/shared/observability/eventLog';

type AuthState = {
  loading: boolean;
  session: Session | null;
  user: User | null;

  init: () => Promise<() => void>;
  signInWithPassword: (identifier: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signUpWithPassword: (params: {
    email: string;
    password: string;
    username: string;
    firstName: string;
    lastName: string;
  }) => Promise<{ needsEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
};

async function syncProfileFromUser(user: User) {
  const username = (user.user_metadata?.username as string | undefined) ?? null;
  const firstName = (user.user_metadata?.first_name as string | undefined) ?? null;
  const lastName = (user.user_metadata?.last_name as string | undefined) ?? null;
  const email = user.email ?? null;

  if (!email) return;

  const { data: existing } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .maybeSingle();

  const resolvedUsername = username ?? existing?.username ?? `user_${user.id.slice(0, 8)}`;

  await supabase.from('profiles').upsert(
    {
      id: user.id,
      email,
      username: resolvedUsername,
      first_name: firstName,
      last_name: lastName,
    },
    { onConflict: 'id' },
  );
}

export const useAuthStore = create<AuthState>((set) => ({
  loading: true,
  session: null,
  user: null,

  init: async () => {
    set({ loading: true });
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user ?? null;
    set({ session: data.session, user, loading: false });

    if (user) {
      try {
        await syncProfileFromUser(user);
      } catch {
        // ignore profile sync errors; auth should still work
      }
    }

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      set({ session, user: session?.user ?? null });
      if (session?.user) {
        try {
          await syncProfileFromUser(session.user);
        } catch {
          // ignore
        }
      }
    });

    return () => listener.subscription.unsubscribe();
  },

  signInWithPassword: async (identifier, password) => {
    set({ loading: true });
    const startedAt = performance.now();
    const trimmed = identifier.trim();
    let email = trimmed;
    if (!trimmed.includes('@')) {
      const { data, error } = await supabase.rpc('get_email_by_username', { u: trimmed });
      if (error) {
        set({ loading: false });
        throw error;
      }
      if (!data) {
        // Perform an equivalent-cost dummy auth attempt so a nonexistent username doesn't
        // resolve measurably faster than a real one (timing side-channel). This is on top of,
        // not instead of, the server-side per-caller rate limit inside get_email_by_username
        // itself (see backend/supabase/migrations/0007_rate_limit_get_email_by_username.sql) —
        // timing equalization alone doesn't stop a script from just calling the RPC in a loop.
        await supabase.auth.signInWithPassword({
          email: `${trimmed || 'nr-unknown-user'}@nr-nonexistent.invalid`,
          password,
        });
        set({ loading: false });
        throw new Error('Usuario o contraseña inválidos');
      }
      email = data;
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    set({ loading: false });
    if (error) throw error;

    if (data.user) {
      void logAppEvent({
        user_id: data.user.id,
        event_name: 'auth_login_success',
        meta: {
          flow: 'login_password',
          duration_ms: Math.round(performance.now() - startedAt),
        },
      });
    }
  },

  signInWithGoogle: async () => {
    set({ loading: true });
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/app`,
      },
    });
    set({ loading: false });
    if (error) throw error;
  },

  signUpWithPassword: async ({ email, password, username, firstName, lastName }) => {
    set({ loading: true });
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          first_name: firstName,
          last_name: lastName,
        },
      },
    });
    set({ loading: false });
    if (error) throw error;

    if (data.user) {
      try {
        await syncProfileFromUser(data.user);
      } catch {
        // ignore
      }
    }

    return { needsEmailConfirmation: !data.session };
  },

  signOut: async () => {
    // Clear local session state before the network call resolves, not after: callers (e.g.
    // the dashboard's sign-out handler) navigate away immediately without awaiting this
    // function, so if `session` stayed truthy in the meantime, a fast-enough re-navigation to
    // /login would see the stale session and bounce straight back to /app via its
    // already-authenticated redirect.
    set({ loading: true, session: null, user: null });
    const { error } = await supabase.auth.signOut();
    set({ loading: false });
    if (error) throw error;
  },
}));

export function useAuth() {
  return useAuthStore();
}
