import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { searchTrails, fetchTrailPolyline, fetchCommunityHikes } from './waymarkedTrails';

const server = setupServer(
  http.get('https://hiking.waymarkedtrails.org/api/v1/list/by_area', () =>
    HttpResponse.json({
      results: [
        { id: 300393, name: 'European long distance path E5', ref: 'E5', group: 'INT' },
        { id: 11009657, name: 'TransLagorai', ref: 'TL', group: 'REG' },
        { id: 999, name: 'Sentiero 473', ref: '473', group: 'LOC' }, // local path → excluded
      ],
    }),
  ),
  http.get('https://hiking.waymarkedtrails.org/api/v1/list/search', () =>
    HttpResponse.json({
      query: 'trans',
      results: [
        { id: 11009657, name: 'TransLagorai', ref: 'TL', itinerary: ['Vetriolo', 'Passo Rolle'] },
        { id: 42, ref: 'E5' },
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

describe('searchTrails', () => {
  it('maps results and falls back to ref/id for the name', async () => {
    const hits = await searchTrails('trans');
    expect(hits).toHaveLength(2);
    expect(hits[0]).toMatchObject({ id: 11009657, name: 'TransLagorai', ref: 'TL' });
    expect(hits[1]!.name).toBe('E5'); // no name → ref
  });

  it('short-circuits a too-short query', async () => {
    expect(await searchTrails('a')).toEqual([]);
  });
});

describe('fetchTrailPolyline', () => {
  it('returns a reprojected WGS84 polyline', async () => {
    const line = await fetchTrailPolyline(11009657);
    expect(line).toHaveLength(2);
    expect(line[0]!.lng).toBeCloseTo(0, 6);
    expect(line[1]!.lng).toBeCloseTo(180, 6);
  });
});

describe('fetchCommunityHikes', () => {
  const bbox = { south: 46.0, west: 11.2, north: 46.3, east: 11.6 };

  it('keeps only regional+ named hikes (drops local paths) and loads their geometry', async () => {
    const hikes = await fetchCommunityHikes(bbox, 12);
    expect(hikes.map((h) => h.id).sort((a, b) => a - b)).toEqual([300393, 11009657]); // no LOC "473"
    expect(hikes.every((h) => h.points.length >= 2)).toBe(true);
  });

  it('respects the cap', async () => {
    const hikes = await fetchCommunityHikes(bbox, 1);
    expect(hikes).toHaveLength(1);
  });
});
