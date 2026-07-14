// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SearchBox } from './SearchBox';
import { useAppStore } from '../state/store';

// The geocoder is mocked; we only assert that picking a suggestion appends a named stop.
vi.mock('../services/geocodeClient', () => ({
  searchPlaces: vi.fn(async () => [
    { id: 'a', name: 'Serso', context: 'Trento, Italy', lng: 11.45, lat: 46.06 },
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

  it('adds a searched place as a named stop', async () => {
    renderBox();
    await userEvent.type(
      screen.getByRole('combobox', { name: /search address or place/i }),
      'serso',
    );
    const option = await screen.findByText('Serso', undefined, { timeout: 2000 });
    await userEvent.click(option);

    const waypoints = useAppStore.getState().waypoints;
    expect(waypoints).toHaveLength(1);
    expect(waypoints[0]!.name).toBe('Serso');
    expect(waypoints[0]!.lng).toBeCloseTo(11.45, 2);
    expect(waypoints[0]!.lat).toBeCloseTo(46.06, 2);
  });
});
