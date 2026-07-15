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

describe('parseOverpassPois — extended categories', () => {
  const extended = {
    version: 0.6,
    generator: 'test',
    elements: [
      {
        type: 'node',
        id: 1,
        lat: 47.1,
        lon: 11.1,
        tags: { tourism: 'hotel', name: 'Hotel Alpina' },
      },
      {
        type: 'node',
        id: 2,
        lat: 47.2,
        lon: 11.2,
        tags: { tourism: 'guest_house', name: 'Gasthof Rose' },
      },
      {
        type: 'node',
        id: 3,
        lat: 47.3,
        lon: 11.3,
        tags: { natural: 'peak', name: 'Hohe Warte', ele: '2780' },
      },
      {
        type: 'node',
        id: 4,
        lat: 47.4,
        lon: 11.4,
        tags: { tourism: 'viewpoint', name: 'Panorama' },
      },
      {
        type: 'node',
        id: 5,
        lat: 47.5,
        lon: 11.5,
        tags: { natural: 'waterfall', name: 'Stuiben' },
      },
      {
        type: 'node',
        id: 6,
        lat: 47.6,
        lon: 11.6,
        tags: { waterway: 'waterfall', name: 'Krimml' },
      },
    ],
  };

  it('maps hotels, guesthouses, peaks, viewpoints, and waterfalls (both waterfall tags)', () => {
    const pois = parseOverpassPois(extended);
    expect(pois.map((p) => p.kind).sort()).toEqual([
      'guesthouse',
      'hotel',
      'peak',
      'viewpoint',
      'waterfall',
      'waterfall',
    ]);
    expect(pois.find((p) => p.kind === 'peak')?.name).toBe('Hohe Warte');
  });

  it('counts hotels + guesthouses as overnight shelters, but not peaks/viewpoints/waterfalls', () => {
    const shelters = sheltersFrom(parseOverpassPois(extended));
    expect(shelters.map((s) => s.kind).sort()).toEqual(['guesthouse', 'hotel']);
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
