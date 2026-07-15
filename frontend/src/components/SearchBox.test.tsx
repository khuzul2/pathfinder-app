// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SearchBox } from './SearchBox';
import { useAppStore } from '../state/store';

// Upstreams are mocked; we assert results are grouped by type and picking each does the right thing.
vi.mock('../services/geocodeClient', () => ({
  searchPlaces: vi.fn(async () => [
    { id: 'a', name: 'Serso', context: 'Trento, Italy', lng: 11.45, lat: 46.06 },
  ]),
}));
vi.mock('../services/waymarkedTrails', () => ({
  searchTrails: vi.fn(async () => [
    { id: 42, name: 'Via Francigena', ref: 'VF', itinerary: ['Canterbury', 'Rome'] },
  ]),
  fetchTrailPolyline: vi.fn(async () => [
    { lng: 0, lat: 0 },
    { lng: 1, lat: 1 },
  ]),
}));

const initial = useAppStore.getState();

function renderBox() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <SearchBox />
    </QueryClientProvider>,
  );
}

describe('SearchBox', () => {
  beforeEach(() => useAppStore.setState(initial, true));

  it('groups results, and picking a place adds a named stop', async () => {
    renderBox();
    await userEvent.type(
      screen.getByRole('combobox', { name: /search a place, address, or trail/i }),
      'serso',
    );
    // Results are clearly labelled by type.
    expect(
      await screen.findByText(/places & addresses/i, undefined, { timeout: 2000 }),
    ).toBeInTheDocument();
    expect(screen.getByText(/trails & routes/i)).toBeInTheDocument();

    await userEvent.click(screen.getByText('Serso'));
    const waypoints = useAppStore.getState().waypoints;
    expect(waypoints).toHaveLength(1);
    expect(waypoints[0]!.name).toBe('Serso');
    expect(useAppStore.getState().mapFocusNonce).toBeGreaterThan(0);
  });

  it('picking a trail replaces the route with the imported hike', async () => {
    renderBox();
    await userEvent.type(
      screen.getByRole('combobox', { name: /search a place, address, or trail/i }),
      'franc',
    );
    const trail = await screen.findByText(/Via Francigena/i, undefined, { timeout: 2000 });
    await userEvent.click(trail);

    await screen.findByRole('combobox'); // let the async import settle
    const waypoints = useAppStore.getState().waypoints;
    expect(waypoints.length).toBeGreaterThanOrEqual(2);
    expect(waypoints[0]!.name).toBe('Via Francigena');
  });
});
