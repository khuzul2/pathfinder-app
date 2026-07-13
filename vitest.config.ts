import { defineConfig } from 'vitest/config';

// Root Vitest config covering pure-logic (frontend/src/lib) + backend integration.
// Determinism: fixed UTC timezone, globals on, hermetic (MSW enforces no live sockets
// in the tests that use it). When the loop adds React component tests (*.test.tsx that
// need a DOM) it should introduce a jsdom Vitest workspace project — do NOT loosen this.
export default defineConfig({
  test: {
    globals: true,
    // Default env is node (pure lib + backend). Component tests opt into jsdom with a
    // `// @vitest-environment jsdom` docblock at the top of the *.test.tsx file.
    environment: 'node',
    include: [
      'frontend/src/**/*.test.ts',
      'frontend/src/**/*.test.tsx',
      'backend/src/**/*.test.ts',
      'backend/test/**/*.test.ts',
    ],
    setupFiles: ['./frontend/test/setup.ts'],
    coverage: {
      provider: 'v8',
      // Coverage teeth apply to the pure domain logic only — the code the loop must
      // build test-first (Tobler, geo, elevation, gpx, slicing). No global threshold
      // (which would tempt low-value DOM-glue tests to pad the number).
      include: ['frontend/src/lib/**/*.ts'],
      exclude: ['frontend/src/lib/**/*.test.ts', 'frontend/src/lib/**/index.ts'],
      reporter: ['text-summary', 'json-summary'],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 85,
        statements: 90,
      },
    },
  },
});
