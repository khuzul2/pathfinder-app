import { setupWorker } from 'msw/browser';
import { http, HttpResponse } from 'msw';
import { synthRouteResponse, synthPoisResponse, type DemoBbox } from './synth';

// DEMO-only MSW browser worker. Intercepts the /api/* proxy routes and serves synthetic data
// so the public site is fully interactive with NO backend and NO server keys. Mapbox tiles and
// RainViewer radar tiles still hit the real network (onUnhandledRequest: 'bypass').

const demoWeather = {
  timezone: 'Europe/Berlin',
  current: { dt: 0, temp: 12.4, wind_speed: 3.1 },
  minutely: [
    { dt: 0, precipitation: 0.1 },
    { dt: 60, precipitation: 0.3 },
  ],
  hourly: [{ dt: 0, temp: 12.4, wind_speed: 3.1, pop: 0.2 }],
  daily: [{ dt: 0 }],
  alerts: [],
};

export async function startDemoWorker(baseUrl: string): Promise<void> {
  const worker = setupWorker(
    http.post('*/api/route', async ({ request }) => {
      const body = (await request.json()) as { coordinates?: Array<[number, number]> };
      const coords = body.coordinates ?? [];
      if (coords.length < 2)
        return HttpResponse.json({ error: 'invalid_request' }, { status: 400 });
      return HttpResponse.json(synthRouteResponse(coords));
    }),
    http.get('*/api/pois', ({ request }) => {
      const u = new URL(request.url);
      const bbox: DemoBbox = {
        south: Number(u.searchParams.get('south')),
        west: Number(u.searchParams.get('west')),
        north: Number(u.searchParams.get('north')),
        east: Number(u.searchParams.get('east')),
      };
      return HttpResponse.json(synthPoisResponse(bbox));
    }),
    http.get('*/api/weather', ({ request }) => {
      const u = new URL(request.url);
      return HttpResponse.json({
        ...demoWeather,
        lat: Number(u.searchParams.get('lat')),
        lon: Number(u.searchParams.get('lon')),
      });
    }),
    http.get('*/api/radar', () =>
      HttpResponse.json({
        version: '2.0',
        host: 'https://tilecache.rainviewer.com',
        radar: { past: [{ time: 0, path: '/v2/radar/0' }], nowcast: [] },
      }),
    ),
  );

  await worker.start({
    serviceWorker: { url: `${baseUrl}mockServiceWorker.js` },
    onUnhandledRequest: 'bypass',
    quiet: true,
  });
}
