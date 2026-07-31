import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;
const BASE_URL = `http://localhost:${PORT}`;

// Several specs share the same two real Supabase test accounts (E2E_USER_IDENTIFIER doubles as
// "user A" in the RLS regression tests). Running them across multiple parallel workers lets one
// test's routine creation/deletion interleave with another's read of the same account mid-run -
// observed in practice as a "Rutina para analíticas" select coming back empty and a
// duplicate-button strict-mode violation, neither reproducible when the same spec runs alone.
// Force a single worker whenever those credentials are set (i.e. whenever the real-backend tests
// will actually execute, not skip) so the whole real-backend suite runs sequentially instead of
// racing itself.
const usesSharedRealAccounts = Boolean(
  process.env.E2E_USER_IDENTIFIER || process.env.E2E_USER_B_IDENTIFIER,
);

export default defineConfig({
  testDir: './e2e',
  fullyParallel: !usesSharedRealAccounts,
  workers: usesSharedRealAccounts ? 1 : undefined,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html']],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    env: {
      // Dummy values so the app boots without requiring real secrets.
      VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL ?? 'https://example.supabase.co',
      VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY ?? 'sb_publishable_dummy',
    },
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
});
