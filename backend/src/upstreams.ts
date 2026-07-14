import type { RouteRequest, BboxQuery } from './validation';

// Upstream base URLs are HARDCODED here (never client-supplied) — the SSRF guard. The proxy
// injects server secrets and maps upstream failures to a clean status the toast layer reads.

const ORS_BASE = 'https://api.openrouteservice.org/v2/directions';
const OPENWEATHER_URL = 'https://api.openweathermap.org/data/3.0/onecall';
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const RAINVIEWER_URL = 'https://api.rainviewer.com/public/weather-maps.json';

const USER_AGENT = 'PathfinderApp/0.1 (+https://github.com/khuzul2/pathfinder-app)';

/** A mapped upstream failure. `status` is what the client receives. */
export class UpstreamError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly retryAfter?: string,
  ) {
    super(message);
    this.name = 'UpstreamError';
  }
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    // The abort may surface as a DOMException (not instanceof Error), so match by name.
    const name = (err as { name?: unknown } | null)?.name;
    if (name === 'AbortError' || name === 'TimeoutError') {
      throw new UpstreamError(504, 'upstream timed out');
    }
    throw new UpstreamError(502, 'upstream request failed');
  } finally {
    clearTimeout(timer);
  }
}

async function readJson(res: Response, upstream: string): Promise<unknown> {
  if (res.status === 429) {
    throw new UpstreamError(
      429,
      `${upstream} rate limited`,
      res.headers.get('retry-after') ?? undefined,
    );
  }
  if (!res.ok) {
    throw new UpstreamError(502, `${upstream} responded with ${res.status}`);
  }
  try {
    return await res.json();
  } catch {
    throw new UpstreamError(502, `${upstream} returned invalid JSON`);
  }
}

export async function fetchRoute(
  apiKey: string,
  body: RouteRequest,
  timeoutMs: number,
): Promise<unknown> {
  // `profile` is a validated enum, so this URL is never client-controlled (SSRF-safe).
  const profile = body.profile ?? 'foot-hiking';
  const orsBody: Record<string, unknown> = {
    coordinates: body.coordinates,
    elevation: true,
    extra_info: ['surface', 'traildifficulty', 'steepness'],
  };
  // ORS only supports alternatives for exactly two waypoints.
  if (body.alternatives && body.coordinates.length === 2) {
    orsBody.alternative_routes = { target_count: 3, share_factor: 0.6, weight_factor: 1.6 };
  }
  const res = await fetchWithTimeout(
    `${ORS_BASE}/${profile}/geojson`,
    {
      method: 'POST',
      headers: {
        Authorization: apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/geo+json',
        'User-Agent': USER_AGENT,
      },
      body: JSON.stringify(orsBody),
    },
    timeoutMs,
  );
  return readJson(res, 'ORS');
}

export async function fetchWeather(
  apiKey: string,
  lat: number,
  lon: number,
  timeoutMs: number,
): Promise<unknown> {
  const url = new URL(OPENWEATHER_URL);
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lon));
  url.searchParams.set('units', 'metric');
  // Deliberately do NOT exclude `minutely` (rain nowcast) or `alerts` (severe-weather).
  url.searchParams.set('appid', apiKey);
  const res = await fetchWithTimeout(
    url.toString(),
    { method: 'GET', headers: { 'User-Agent': USER_AGENT } },
    timeoutMs,
  );
  return readJson(res, 'OpenWeather');
}

export async function fetchPois(bbox: BboxQuery): Promise<unknown> {
  const { south, west, north, east } = bbox;
  const b = `(${south},${west},${north},${east})`;
  const query =
    `[out:json][timeout:25];(` +
    `node["tourism"="alpine_hut"]${b};` +
    `node["tourism"="camp_site"]${b};` +
    `node["natural"="spring"]${b};` +
    `);out body;`;
  // Overpass sets its own [timeout:25]; give the socket a little more headroom.
  const res = await fetchWithTimeout(
    OVERPASS_URL,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': USER_AGENT,
      },
      body: new URLSearchParams({ data: query }).toString(),
    },
    30_000,
  );
  return readJson(res, 'Overpass');
}

export async function fetchRadar(timeoutMs: number): Promise<unknown> {
  const res = await fetchWithTimeout(
    RAINVIEWER_URL,
    { method: 'GET', headers: { 'User-Agent': USER_AGENT } },
    timeoutMs,
  );
  return readJson(res, 'RainViewer');
}
