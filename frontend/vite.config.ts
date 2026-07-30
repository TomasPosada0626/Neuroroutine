import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
    coverage: {
      // `include` alone makes every matched src file count toward coverage, not just
      // files a test happens to import (Vitest 4 dropped the old `all` flag — this is
      // now the default whenever `include` is set). Without it, files with zero unit
      // tests were silently dropped from the denominator instead of counting as 0% —
      // that made the reported 94%+ number real-but-misleading. Keep `include` broad;
      // narrow gaps with the `exclude` list below instead of scoping `include` down.
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        '**/*.d.ts',
        'src/**/index.ts',
        // App bootstrap: mounts to the real #root DOM node and dynamically imports the
        // app bundle. Testing it means mocking createRoot/dynamic import for a script
        // with no branching logic worth asserting on.
        'src/main.tsx',
        // Declarative client construction, no conditional logic.
        'src/shared/api/queryClient.ts',
        // Throws at module load if env vars are missing; the only "branch" is a
        // fail-fast guard already exercised by every dev/CI run that boots the app.
        'src/shared/api/supabaseClient.ts',
        // Route-level page compositions already verified end-to-end against the real
        // Supabase backend, including a full accessibility (axe) sweep — see
        // frontend/e2e/*.spec.ts. Writing component-level unit tests for these (esp.
        // the 2500+ line DashboardPage) would mostly re-assert JSX wiring already
        // covered by E2E; pure logic extracted out of them (dashboardAnalytics.ts,
        // dashboardUtils.ts, seedDemoData.ts, etc.) is unit-tested directly instead.
        // The auth pages (Login/Register/Forgot/Reset), by contrast, hold real
        // branching logic (validation, error-vs-non-Error messages, session gating)
        // that's now covered directly — see src/pages/__tests__/*.
        'src/pages/DashboardPage.tsx',
        'src/pages/LandingPage.tsx',
      ],
      reporter: ['text', 'html'],
      // Raised 2026-07 after closing the real gaps this measured `include` surfaced
      // (previously reported 94%+ was misleading: files with zero unit tests were
      // dropped from the denominator instead of counting as 0%, see the `include`
      // comment above). Current real numbers are ~97.7/87.5/99.5/99.8 (stmts/branches/
      // funcs/lines) — thresholds sit a few points below that as a real regression
      // gate with headroom, not at the ceiling. Raise them further as coverage grows;
      // don't lower them to make a failing change pass.
      thresholds: {
        statements: 96,
        branches: 84,
        functions: 98,
        lines: 99,
      },
    },
  },
});
