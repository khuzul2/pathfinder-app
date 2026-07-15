import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { searchTrails, fetchTrailPolyline } from './waymarkedTrails';

const server = setupServer(
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
