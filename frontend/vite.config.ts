import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

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
      exclude: [
        '**/*.d.ts',
        'src/**/index.ts',
        'src/features/dashboard/store/dashboardPrefsStore.ts',
        'src/features/dashboard/utils/dashboardUtils.ts',
      ],
      reporter: ['text', 'html'],
    },
  },
})
