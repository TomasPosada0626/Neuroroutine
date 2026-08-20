import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';

// ARCHITECTURE.md's dependency rules, enforced here instead of only documented: until this rule
// existed, `dashboard` importing `reminders` internals directly slipped past manual review with
// nothing automated to catch it (fixed by injecting a callback from the page instead — see
// InsightsWidget's onScheduleReminderAtHour prop). Add a feature folder name here to get the same
// boundary for it for free; `auth` is deliberately never in another feature's forbidden list -
// it's the one documented cross-cutting exception (nearly every feature needs the current user's
// identity).
const FEATURES = ['auth', 'dashboard', 'reminders', 'routines'];

function crossFeatureRestrictions(featureName) {
  return FEATURES.filter((f) => f !== featureName && f !== 'auth').map((f) => ({
    group: [`@/features/${f}`, `@/features/${f}/*`],
    message:
      `features/${featureName} cannot import features/${f} internals directly (see ARCHITECTURE.md) - ` +
      'invert the dependency via a prop/callback from the page, or move shared logic to shared/state.',
  }));
}

export default defineConfig([
  globalIgnores(['dist', 'coverage', '.stryker-tmp', 'reports']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  {
    files: ['src/shared/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/features', '@/features/*', '@/pages', '@/pages/*'],
              message: 'shared cannot import from features or pages (see ARCHITECTURE.md).',
            },
          ],
        },
      ],
    },
  },
  ...FEATURES.map((featureName) => ({
    files: [`src/features/${featureName}/**/*.{ts,tsx}`],
    rules: {
      'no-restricted-imports': ['error', { patterns: crossFeatureRestrictions(featureName) }],
    },
  })),
]);
