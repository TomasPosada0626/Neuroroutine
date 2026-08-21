/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  testRunner: 'vitest',
  reporters: ['clear-text', 'html'],
  mutate: [
    'src/features/routines/**/*.ts',
    'src/shared/lib/**/*.ts',
    // Highest-risk surface after routines/shared/lib per the audit roadmap's own recommended
    // order (login, session, password reset) — expand further incrementally from here.
    'src/features/auth/**/*.ts',
    // Next tranche (audit: Testabilidad — these had high line coverage but zero mutation
    // coverage): the pure-logic .ts modules behind the dashboard/reminders/offline features.
    // Their .tsx components stay out of scope for now, same reasoning as routines/auth above.
    'src/features/dashboard/utils/**/*.ts',
    'src/features/reminders/**/*.ts',
    'src/shared/offline/**/*.ts',
    '!**/__tests__/**',
    '!**/*.test.ts',
    '!**/*.test.tsx',
  ],
  coverageAnalysis: 'off',
  tempDirName: '.stryker-tmp',
  htmlReporter: {
    fileName: 'reports/mutation/mutation.html',
  },
};
