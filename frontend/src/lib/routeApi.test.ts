// @vitest-environment jsdom
import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { requestRoute } from './routeApi';

const orsFixture = JSON.parse(
  readFileSync(resolve(process.cwd(), 'test/fixtures/ors-foot-hiking.geojson'), 'utf-8'),
);

let capturedBody: unknown = null;
const server = setupServer(
  http.post('*/api/route', async ({ request }) => {
    capturedBody = await request.json();
    return HttpResponse.json(orsFixture);
  }),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  capturedBody = null;
});
afterAll(() => server.close());

describe('requestRoute', () => {
  it('posts waypoints as [lng, lat] pairs and returns an analyzed route', async () => {
    const analysis = await requestRoute([
      { lng: 11.5761, lat: 48.1374 },
      { lng: 11.582, lat: 48.1402 },
    ]);
    expect(capturedBody).toEqual({
      coordinates: [
        [11.5761, 48.1374],
        [11.582, 48.1402],
      ],
    });
    expect(analysis.distanceMeters).toBeGreaterThan(400);
    expect(analysis.ascentMeters).toBeCloseTo(32.9, 1);
    expect(analysis.points.length).toBeGreaterThan(1);
  });

  it('includes the profile in the body when provided', async () => {
    await requestRoute(
      [
        { lng: 11.5761, lat: 48.1374 },
        { lng: 11.582, lat: 48.1402 },
      ],
      { profile: 'foot-walking' },
    );
    expect(capturedBody).toEqual({
      coordinates: [
        [11.5761, 48.1374],
        [11.582, 48.1402],
      ],
      profile: 'foot-walking',
    });
  });

  it('throws on a non-ok proxy response', async () => {
    server.use(http.post('*/api/route', () => new HttpResponse(null, { status: 502 })));
    await expect(
      requestRoute([
        { lng: 0, lat: 0 },
        { lng: 1, lat: 1 },
      ]),
    ).rejects.toThrow(/502/);
  });
});
