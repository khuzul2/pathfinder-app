import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';

// Specs in ./e2e. The verify gate runs this in the `--full` pass (auto-skips when there are
// no specs). The Phase 2 shell renders with NO Mapbox token in this build, so it needs no
// live map, no WebGL, and makes no external calls — fully deterministic.
//
// This sandbox ships Chromium at /opt/pw-browsers/chromium (a different revision than the
// pinned @playwright/test), so point at it via executablePath instead of downloading. In CI,
// that path is absent and Playwright uses its own installed browser.
const localChromium = '/opt/pw-browsers/chromium';
const executablePath = existsSync(localChromium) ? localChromium : undefined;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], launchOptions: { executablePath } },
    },
  ],
  webServer: {
    // Serves the built SPA. verify:full runs the `build` stage first; for a standalone
    // `npm run e2e`, this build makes it self-contained.
    command: 'npm run build -w frontend && npm run preview -w frontend',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
