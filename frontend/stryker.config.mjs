/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  testRunner: 'vitest',
  reporters: ['clear-text', 'html'],
  mutate: [
    'src/features/routines/**/*.ts',
    'src/shared/lib/**/*.ts',
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
