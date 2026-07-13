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

// Smoke test of the whole shell. MapCanvas skips real Mapbox init here (no token, no WebGL),
// so the shell renders cleanly in jsdom.
describe('App shell', () => {
  beforeEach(() => useAppStore.setState(initial, true));

  it('renders the heading, controls, map container, and attribution', () => {
    renderApp();
    expect(screen.getByRole('heading', { name: /pathfinder/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /radar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /theme/i })).toBeInTheDocument();
    expect(screen.getByTestId('map-canvas')).toBeInTheDocument();
    expect(screen.getByText(/OpenStreetMap/)).toBeInTheDocument();
  });

  it('shows a Clear button only after waypoints exist', () => {
    renderApp();
    expect(screen.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument();
    useAppStore.setState({ waypoints: [{ lng: 11, lat: 48 }] });
    renderApp();
    expect(screen.getAllByRole('button', { name: /clear/i }).length).toBeGreaterThan(0);
  });
});
