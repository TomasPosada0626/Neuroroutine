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
