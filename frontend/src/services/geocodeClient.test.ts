// @vitest-environment jsdom
import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { searchPlaces, reverseGeocode } from './geocodeClient';

const fixture = JSON.parse(
  readFileSync(resolve(process.cwd(), 'test/fixtures/mapbox-geocode.json'), 'utf-8'),
);

let capturedUrl: URL | null = null;
const server = setupServer(
  http.get('*/search/geocode/v6/forward', ({ request }) => {
    capturedUrl = new URL(request.url);
    return HttpResponse.json(fixture);
  }),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  capturedUrl = null;
});
afterAll(() => server.close());

describe('searchPlaces', () => {
  it('queries Mapbox with the token + proximity and returns parsed suggestions', async () => {
    const results = await searchPlaces('serso', {
      token: 'pk.test',
      proximity: { lng: 11.6, lat: 48.15 },
    });
    expect(results[0]!.name).toBe('Serso');
    expect(capturedUrl!.searchParams.get('q')).toBe('serso');
    expect(capturedUrl!.searchParams.get('access_token')).toBe('pk.test');
    expect(capturedUrl!.searchParams.get('proximity')).toBe('11.6,48.15');
    // "poi" is not a valid Geocoding v6 type and 422s the request — keep it out.
    expect(capturedUrl!.searchParams.get('types')).not.toContain('poi');
  });

  it('short-circuits (no request) for a too-short query', async () => {
    const results = await searchPlaces('s', { token: 'pk.test' });
    expect(results).toEqual([]);
    expect(capturedUrl).toBeNull();
  });

  it('returns [] when no token is available', async () => {
    const results = await searchPlaces('munich', { token: '' });
    expect(results).toEqual([]);
    expect(capturedUrl).toBeNull();
  });

  it('throws on a non-ok response', async () => {
    server.use(
      http.get('*/search/geocode/v6/forward', () => new HttpResponse(null, { status: 429 })),
    );
    await expect(searchPlaces('munich', { token: 'pk.test' })).rejects.toThrow(/429/);
  });
});

describe('reverseGeocode', () => {
  it('returns the first result name for a point', async () => {
    server.use(http.get('*/search/geocode/v6/reverse', () => HttpResponse.json(fixture)));
    const name = await reverseGeocode(11.45, 46.06, { token: 'pk.test' });
    expect(name).toBe('Serso');
  });

  it('returns null on failure or missing token', async () => {
    server.use(
      http.get('*/search/geocode/v6/reverse', () => new HttpResponse(null, { status: 500 })),
    );
    expect(await reverseGeocode(11.45, 46.06, { token: 'pk.test' })).toBeNull();
    expect(await reverseGeocode(11.45, 46.06, { token: '' })).toBeNull();
  });
});
