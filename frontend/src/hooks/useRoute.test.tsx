// @vitest-environment jsdom
import { describe, it, expect, beforeAll, afterEach, afterAll, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { useRoute } from './useRoute';
import { useAppStore } from '../state/store';

const orsFixture = JSON.parse(
  readFileSync(resolve(process.cwd(), 'test/fixtures/ors-foot-hiking.geojson'), 'utf-8'),
);
const server = setupServer(http.post('*/api/route', () => HttpResponse.json(orsFixture)));

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const initial = useAppStore.getState();

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useRoute', () => {
  beforeEach(() => useAppStore.setState(initial, true));

  it('does not fetch with fewer than 2 waypoints', () => {
    renderHook(() => useRoute(), { wrapper });
    expect(useAppStore.getState().route).toBeNull();
  });

  it('fetches and stores the analyzed route once there are 2 waypoints', async () => {
    useAppStore.setState({
      waypoints: [
        { lng: 11.5761, lat: 48.1374 },
        { lng: 11.582, lat: 48.1402 },
      ],
    });
    renderHook(() => useRoute(), { wrapper });
    await waitFor(() => expect(useAppStore.getState().route).not.toBeNull());
    expect(useAppStore.getState().route!.ascentMeters).toBeCloseTo(32.9, 1);
  });

  it('surfaces an error into the store on failure', async () => {
    server.use(http.post('*/api/route', () => new HttpResponse(null, { status: 502 })));
    useAppStore.setState({
      waypoints: [
        { lng: 0, lat: 0 },
        { lng: 1, lat: 1 },
      ],
    });
    renderHook(() => useRoute(), { wrapper });
    await waitFor(() => expect(useAppStore.getState().routeError).not.toBeNull());
  });
});
