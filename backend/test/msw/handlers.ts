import { http, HttpResponse } from 'msw';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Hermetic upstream mocks: serve the frozen fixtures and capture the injected credentials so
// tests can prove the proxy forwards the (fake) key upstream — with zero real keys.

export const ORS_URL = 'https://api.openrouteservice.org/v2/directions/foot-hiking/geojson';
/** Matches any foot profile so a `foot-walking` request is served too. */
export const ORS_URL_PATTERN = 'https://api.openrouteservice.org/v2/directions/:profile/geojson';
export const OPENWEATHER_URL = 'https://api.openweathermap.org/data/3.0/onecall';
export const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
export const RAINVIEWER_URL = 'https://api.rainviewer.com/public/weather-maps.json';

export const captured: {
  orsAuth: string | null;
  orsProfile: string | null;
  orsAlternatives: boolean;
  weatherAppid: string | null;
} = {
  orsAuth: null,
  orsProfile: null,
  orsAlternatives: false,
  weatherAppid: null,
};

export function resetCaptured(): void {
  captured.orsAuth = null;
  captured.orsProfile = null;
  captured.orsAlternatives = false;
  captured.weatherAppid = null;
}

function fixture(name: string): any {
  return JSON.parse(readFileSync(resolve(process.cwd(), 'test/fixtures', name), 'utf-8'));
}

export const handlers = [
  http.post(ORS_URL_PATTERN, async ({ request, params }) => {
    captured.orsAuth = request.headers.get('authorization');
    captured.orsProfile = typeof params.profile === 'string' ? params.profile : null;
    const body = (await request.json().catch(() => ({}))) as { alternative_routes?: unknown };
    captured.orsAlternatives = body.alternative_routes != null;
    return HttpResponse.json(fixture('ors-foot-hiking.geojson'));
  }),
  http.get(OPENWEATHER_URL, ({ request }) => {
    captured.weatherAppid = new URL(request.url).searchParams.get('appid');
    return HttpResponse.json(fixture('openweather-onecall.json'));
  }),
  http.post(OVERPASS_URL, () => HttpResponse.json(fixture('overpass-poi.json'))),
  http.get(RAINVIEWER_URL, () => HttpResponse.json(fixture('rainviewer-weather-maps.json'))),
];
