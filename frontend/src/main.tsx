import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from './App';
import { useAppStore } from './state/store';
import { loadThemePref } from './lib/theme';
import './index.css';

// Hydrate the persisted theme choice before first paint (avoids a flash).
useAppStore.getState().setThemePref(loadThemePref(window.localStorage));

const queryClient = new QueryClient();

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
