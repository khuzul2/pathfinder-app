// @vitest-environment jsdom
import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseOverpassPois, sheltersFrom, requestPois } from './poiApi';

const overpassFixture = JSON.parse(
  readFileSync(resolve(process.cwd(), 'test/fixtures/overpass-poi.json'), 'utf-8'),
);

describe('parseOverpassPois', () => {
  it('maps huts, campsites, and springs from the fixture', () => {
    const pois = parseOverpassPois(overpassFixture);
    expect(pois).toHaveLength(3);
    expect(pois.map((p) => p.kind).sort()).toEqual(['alpine_hut', 'camp_site', 'spring']);
    const hut = pois.find((p) => p.kind === 'alpine_hut');
    expect(hut?.name).toBe('Pfeishütte');
  });

  it('exposes only huts + campsites as overnight shelters', () => {
    const shelters = sheltersFrom(parseOverpassPois(overpassFixture));
    expect(shelters).toHaveLength(2);
    expect(shelters.every((s) => s.kind !== 'spring')).toBe(true);
  });
});

describe('requestPois', () => {
  const server = setupServer(http.get('*/api/pois', () => HttpResponse.json(overpassFixture)));
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('fetches and parses POIs for a bbox', async () => {
    const pois = await requestPois({ south: 47.1, west: 11.2, north: 47.4, east: 11.6 });
    expect(pois).toHaveLength(3);
  });

  it('throws on a non-ok response', async () => {
    server.use(http.get('*/api/pois', () => new HttpResponse(null, { status: 504 })));
    await expect(requestPois({ south: 0, west: 0, north: 1, east: 1 })).rejects.toThrow(/504/);
  });
});
