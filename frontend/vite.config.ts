import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// Dev server proxies /api -> Express gateway (:8080) so the SPA is same-origin in
// dev, matching prod (where Express serves the built bundle). Only VITE_-prefixed
// env vars are exposed to the client; server secrets (ORS/OpenWeather) never are.
export default defineConfig({
  // Served at '/' normally; GitHub Pages project sites set BASE_PATH=/pathfinder-app/.
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
