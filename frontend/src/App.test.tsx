// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from './App';
import { useAppStore } from './state/store';

const initial = useAppStore.getState();

function renderApp() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <App />
    </QueryClientProvider>,
  );
}

// Smoke test of the shell. MapCanvas skips real Mapbox init here (no token, no WebGL); the
// Vaul mobile sheet only mounts its trigger, so the sidebar content renders once.
describe('App shell', () => {
  beforeEach(() => useAppStore.setState(initial, true));

  it('renders the sidebar, map, layer controls, attribution, and builder instruction', () => {
    renderApp();
    expect(screen.getByRole('heading', { name: /pathfinder/i })).toBeInTheDocument();
    expect(screen.getByTestId('map-canvas')).toBeInTheDocument();
    expect(screen.getByText(/OpenStreetMap/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /rain radar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /theme/i })).toBeInTheDocument();
    expect(screen.getByText(/click the map to add stops/i)).toBeInTheDocument();
  });

  it('reveals the stops list once points exist', () => {
    useAppStore.setState({ waypoints: [{ lng: 11, lat: 48 }] });
    renderApp();
    expect(screen.getByText(/stops \(1\)/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /clear all/i })).toBeInTheDocument();
  });
});
