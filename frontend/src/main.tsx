import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from './App';
import { useAppStore } from './state/store';
import { loadThemePref } from './lib/theme';
import './index.css';

const queryClient = new QueryClient();

async function bootstrap() {
  // Public demo: start the MSW worker that serves synthetic /api data (no backend needed).
  if (import.meta.env.VITE_DEMO === '1') {
    const { startDemoWorker } = await import('./demo/browser');
    await startDemoWorker(import.meta.env.BASE_URL);
  }

  // Hydrate the persisted theme choice before first paint (avoids a flash).
  useAppStore.getState().setThemePref(loadThemePref(window.localStorage));

  const rootEl = document.getElementById('root');
  if (!rootEl) {
    throw new Error('Root element #root not found');
  }

  createRoot(rootEl).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </StrictMode>,
  );
}

void bootstrap();
