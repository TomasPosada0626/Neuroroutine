import { createClient, type Session } from '@supabase/supabase-js';
import type { Page } from '@playwright/test';
import { env } from 'node:process';

// The UI-driven login flow (fill form, click submit, wait for the /app redirect) has been
// failing consistently in CI only - stuck on /login every single run - while the exact same
// credentials against the exact same Supabase project succeed instantly both via a direct
// signInWithPassword call and via a full local Playwright reproduction (see
// docs/github/manual-actions-checklist.md). Two candidate causes: (1) something about that
// specific submit -> onAuthStateChange -> navigate chain misbehaves under CI-only timing, or
// (2) the volume of real login attempts against Supabase's Auth API from a shared runner IP
// trips rate-limiting. This helper routes around both: it authenticates directly against the
// real Auth API (never touches the login form/router) and caches one session per account for
// the whole test run, so N tests reusing "user A" cost exactly one real login instead of N.
const sessionCache = new Map<string, Session>();

function storageKeyFor(supabaseUrl: string): string {
  // Must match supabase-js's own default (SupabaseClient.ts: `sb-${ref}-auth-token`) exactly,
  // or the injected session silently sits unread and the app still thinks it's logged out.
  const ref = new URL(supabaseUrl).hostname.split('.')[0];
  return `sb-${ref}-auth-token`;
}

async function getSession(identifier: string, password: string): Promise<Session> {
  const cached = sessionCache.get(identifier);
  if (cached) return cached;

  const supabaseUrl = env.VITE_SUPABASE_URL!;
  const anonKey = env.VITE_SUPABASE_ANON_KEY!;
  const client = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await client.auth.signInWithPassword({
    email: identifier,
    password,
  });

  if (error || !data.session) {
    throw new Error(
      `E2E API login failed for ${identifier}: ${error?.message ?? 'no session returned'}`,
    );
  }

  sessionCache.set(identifier, data.session);
  return data.session;
}

// Drop-in replacement for driving the login form: authenticates via the API, injects the
// resulting session into localStorage under the app's own supabase-js client's storage key, then
// navigates straight to /app. A page must be on the target origin before its localStorage can be
// written, hence the goto('/') before the evaluate().
export async function apiLogin(page: Page, identifier: string, password: string): Promise<void> {
  const session = await getSession(identifier, password);
  const storageKey = storageKeyFor(env.VITE_SUPABASE_URL!);

  await page.goto('/');
  await page.evaluate(
    ({ key, sessionJson }) => {
      localStorage.setItem(key, sessionJson);
    },
    { key: storageKey, sessionJson: JSON.stringify(session) },
  );
  await page.goto('/app');
  await page.waitForURL(/\/app/, { timeout: 15000 });
}
