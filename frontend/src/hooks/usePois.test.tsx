// @vitest-environment jsdom
import { describe, it, expect, beforeAll, afterEach, afterAll, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { usePois } from './usePois';
import { useAppStore } from '../state/store';

const overpassFixture = JSON.parse(
  readFileSync(resolve(process.cwd(), 'test/fixtures/overpass-poi.json'), 'utf-8'),
);
const server = setupServer(http.get('*/api/pois', () => HttpResponse.json(overpassFixture)));

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const initial = useAppStore.getState();
const bbox = { south: 47.1, west: 11.2, north: 47.4, east: 11.6 };

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('usePois', () => {
  beforeEach(() => useAppStore.setState(initial, true));

  it('does not fetch until an area is committed via "Search this area"', () => {
    useAppStore.setState({ viewportBbox: bbox, viewportZoom: 13, dataArea: null });
    renderHook(() => usePois(), { wrapper });
    expect(useAppStore.getState().pois).toEqual([]);
  });

  it('fetches and stores POIs for the committed search area', async () => {
    useAppStore.setState({ viewportBbox: bbox, viewportZoom: 13, dataArea: bbox });
    renderHook(() => usePois(), { wrapper });
    await waitFor(() => expect(useAppStore.getState().pois.length).toBe(3));
  });
});
