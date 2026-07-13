import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor shell config for the Pathfinder Android wrapper. `webDir` is the Vite build
 * output; run `npm run build:mobile -w frontend` before `npx cap sync` so the native app
 * bundles the freshest web assets. The native project (`android/`) is generated on the
 * developer's machine — see docs/MANUAL_QA.md (the loop has no Android SDK to build an APK).
 */
const config: CapacitorConfig = {
  appId: 'app.pathfinder.mobile',
  appName: 'Pathfinder',
  webDir: 'dist',
  android: {
    // A planned course is a document, not a live map session — keep the web view opaque.
    backgroundColor: '#ffffff',
  },
};

export default config;
