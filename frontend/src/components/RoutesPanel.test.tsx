// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RoutesPanel } from './RoutesPanel';
import { useAppStore } from '../state/store';
import type { SavedRoute } from '../lib/savedRoute';

const initial = useAppStore.getState();

const routeA: SavedRoute = {
  id: 'a',
  name: 'Munich → Innsbruck',
  waypoints: [
    { lng: 11.5, lat: 48.1, name: 'Munich' },
    { lng: 11.4, lat: 47.3, name: 'Innsbruck' },
  ],
  updatedAt: 200,
  route: null,
};
const routeB: SavedRoute = {
  id: 'b',
  name: 'Local loop',
  waypoints: [{ lng: 11.0, lat: 47.0 }],
  updatedAt: 100,
  route: null,
};

beforeEach(() => {
  localStorage.clear();
  useAppStore.setState(initial, true);
});

describe('RoutesPanel', () => {
  it('lists saved routes newest-first', () => {
    useAppStore.setState({ savedRoutes: [routeB, routeA] });
    render(<RoutesPanel />);
    const opens = screen.getAllByRole('button', { name: /open route/i });
    expect(opens[0]).toHaveAccessibleName(/Munich → Innsbruck/); // updatedAt 200 first
    expect(opens[1]).toHaveAccessibleName(/Local loop/);
  });

  it('shows an empty hint with no routes', () => {
    render(<RoutesPanel />);
    expect(screen.getByText(/no saved routes yet/i)).toBeInTheDocument();
  });

  it('New route clears the working state', async () => {
    useAppStore.setState({ waypoints: [{ lng: 1, lat: 1 }], currentRouteId: 'x' });
    render(<RoutesPanel />);
    await userEvent.click(screen.getByRole('button', { name: /new route/i }));
    expect(useAppStore.getState().waypoints).toHaveLength(0);
    expect(useAppStore.getState().currentRouteId).toBeNull();
  });

  it('opens a route into the map', async () => {
    useAppStore.setState({ savedRoutes: [routeA] });
    render(<RoutesPanel />);
    await userEvent.click(screen.getByRole('button', { name: /open route Munich → Innsbruck/i }));
    expect(useAppStore.getState().currentRouteId).toBe('a');
    expect(useAppStore.getState().waypoints.map((w) => w.name)).toEqual(['Munich', 'Innsbruck']);
  });

  it('deletes a route', async () => {
    useAppStore.setState({ savedRoutes: [routeA, routeB] });
    render(<RoutesPanel />);
    await userEvent.click(screen.getByRole('button', { name: /delete route Local loop/i }));
    expect(useAppStore.getState().savedRoutes.map((r) => r.id)).toEqual(['a']);
  });

  it('renames a route inline', async () => {
    useAppStore.setState({ savedRoutes: [routeA] });
    render(<RoutesPanel />);
    await userEvent.click(screen.getByRole('button', { name: /rename route Munich → Innsbruck/i }));
    const input = screen.getByRole('textbox', { name: /rename route/i });
    await userEvent.clear(input);
    await userEvent.type(input, 'Alps traverse{Enter}');
    expect(useAppStore.getState().savedRoutes[0]!.name).toBe('Alps traverse');
  });
});
