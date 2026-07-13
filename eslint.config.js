// Flat ESLint config for the Pathfinder monorepo (frontend + backend + scripts).
// The loop runs `eslint . --max-warnings=0`; keep this the single source of truth.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/coverage/**',
      '**/node_modules/**',
      'verify-result.json',
      'playwright-report/**',
      'test-results/**',
      '**/mockServiceWorker.js',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-console': 'off',
    },
  },
  {
    // Node contexts: backend source, tooling scripts, root config files.
    files: ['backend/**/*.ts', 'scripts/**/*.{js,mjs}', '*.{js,mjs,ts}'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
  {
    // Browser context: the Vite/React frontend.
    files: ['frontend/**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser },
    },
  },
  {
    // Test files may use vitest globals and looser typing.
    files: ['**/*.test.{ts,tsx}', '**/test/**/*.{ts,tsx}', 'e2e/**/*.ts'],
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
);
