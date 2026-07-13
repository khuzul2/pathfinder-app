import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { useAppStore } from './state/store';
import { loadThemePref } from './lib/theme';
import './index.css';

// Hydrate the persisted theme choice before first paint (avoids a flash).
useAppStore.getState().setThemePref(loadThemePref(window.localStorage));

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('Root element #root not found');
}

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
