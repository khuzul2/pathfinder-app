// @vitest-environment jsdom
import { describe, it, expect, beforeAll, afterEach, afterAll, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { TrailSearch } from './TrailSearch';
import { useAppStore } from '../state/store';

const server = setupServer(
  http.get('https://hiking.waymarkedtrails.org/api/v1/list/search', () =>
    HttpResponse.json({
      results: [
        { id: 11009657, name: 'TransLagorai', ref: 'TL', itinerary: ['Vetriolo', 'Rolle'] },
      ],
    }),
  ),
  http.get('https://hiking.waymarkedtrails.org/api/v1/details/relation/:id', () =>
    HttpResponse.json({
      id: 11009657,
      name: 'TransLagorai',
      route: {
        main: [
          {
            ways: [
              {
                geometry: {
                  coordinates: [
                    [0, 0],
                    [10018754, 5009377],
                    [20037508.342789244, 0],
                  ],
                },
              },
            ],
          },
        ],
      },
    }),
  ),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const initial = useAppStore.getState();

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('TrailSearch', () => {
  beforeEach(() => useAppStore.setState(initial, true));

  it('searches and loads a trail as the current route', async () => {
    render(<TrailSearch />, { wrapper });
    await userEvent.type(screen.getByLabelText(/search named hikes/i), 'trans');

    const result = await screen.findByRole('button', { name: /TransLagorai/i }, { timeout: 3000 });
    await userEvent.click(result);

    await waitFor(() => expect(useAppStore.getState().waypoints.length).toBeGreaterThanOrEqual(2));
    expect(useAppStore.getState().waypoints[0]!.name).toBe('TransLagorai');
  });
});
