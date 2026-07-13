import { defineConfig, devices } from '@playwright/test';

// E2E config. Specs live in ./e2e. The verify gate SKIPS the e2e stage until specs
// exist, so this can sit dormant until Phase 2. All network is mocked via page.route
// (onUnhandledRequest must fail) — e2e never touches a live API or a real Mapbox token.
//
// The container ships Chromium at $PLAYWRIGHT_BROWSERS_PATH (/opt/pw-browsers).
// Do NOT run `playwright install`. If a version mismatch appears, set
// `launchOptions.executablePath` to the pre-installed binary instead of downloading.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:8080',
    trace: 'on-first-retry',
    // Fail loudly if a test forgets to stub a request and tries to hit the network.
    serviceWorkers: 'block',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
