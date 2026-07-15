import { toRouteAnalysis, toRouteAnalyses } from '../lib/routeApi';
import { parseOverpassPois, type Poi, type Bbox } from '../lib/poiApi';
import { RainViewerMapsSchema, type RainViewerMaps } from '../contracts/rainviewer';
import { synthRouteResponse, synthPoisResponse } from './synth';
import type { RouteAnalysis } from '../lib/route';
import type { LngLat } from '../lib/geo';
import type { RouteFetchOptions } from '../lib/routingOptions';

/**
 * DEMO-mode data source: call the real upstreams directly from the browser (no backend).
 * Overpass and RainViewer are keyless; ORS needs `VITE_ORS_API_KEY` (embedded in the public
 * bundle by design — ADR-009 decision). If the ORS key is absent or a call fails, fall back
 * to the synthetic responses so the site keeps working. In production these paths are unused
 * (`dataClient` routes through the backend proxy instead).
 */
const ORS_KEY = import.meta.env.VITE_ORS_API_KEY;
const ORS_BASE = 'https://api.openrouteservice.org/v2/directions';
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const RAINVIEWER_URL = 'https://api.rainviewer.com/public/weather-maps.json';

function postOrs(
  profile: string,
  body: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<Response> {
  return fetch(`${ORS_BASE}/${profile}/geojson`, {
    method: 'POST',
    headers: {
      Authorization: ORS_KEY as string,
      'Content-Type': 'application/json',
      Accept: 'application/geo+json',
    },
    body: JSON.stringify(body),
    signal,
  });
}

/** Extract a human-readable message from an ORS error response. */
async function orsError(res: Response): Promise<string> {
  if (res.status === 429) {
    return 'Routing rate limit reached — please wait a minute and try again.';
  }
  const body = (await res.json().catch(() => null)) as {
    error?: { message?: string } | string;
  } | null;
  const detail = body?.error;
  const msg = typeof detail === 'string' ? detail : detail?.message;
  return msg ?? `no walking route found (${res.status})`;
}

/**
 * Request the route(s) directly from ORS. An "enhanced" request snaps each clicked point to the
 * nearest trail (`radiuses: -1`, unlimited) and — for a simple start→end pair — asks for
 * `alternative_routes`; both are best-effort, so a rejection retries with a minimal `base` request.
 * With a real key, a genuine failure is SURFACED (throwing) rather than papered over with a
 * straight synthetic line that looks like a broken route. The synthetic route is only used when
 * no key is configured (keyless demo).
 */
export async function requestRoutesDirect(
  waypoints: readonly LngLat[],
  options: RouteFetchOptions = {},
  signal?: AbortSignal,
): Promise<RouteAnalysis[]> {
  const coordinates = waypoints.map((w): [number, number] => [w.lng, w.lat]);
  if (!ORS_KEY) return [toRouteAnalysis(synthRouteResponse(coordinates))];

  const profile = options.profile ?? 'foot-hiking';
  const base = {
    coordinates,
    elevation: true,
    extra_info: ['surface', 'traildifficulty', 'steepness'],
  };
  const enhanced = {
    ...base,
    radiuses: coordinates.map(() => -1),
    ...(coordinates.length === 2
      ? { alternative_routes: { target_count: 3, share_factor: 0.6, weight_factor: 1.6 } }
      : {}),
  };

  try {
    let res = await postOrs(profile, enhanced, signal);
    // Only a 400 means the radiuses/alternatives params were rejected — retry the minimal request
    // then. Do NOT retry on 429/5xx (that just burns more of the rate-limit budget).
    if (res.status === 400) res = await postOrs(profile, base, signal);
    if (!res.ok) throw new Error(await orsError(res));
    return toRouteAnalyses(await res.json());
  } catch (err) {
    if (signal?.aborted) throw err;
    const msg = err instanceof Error ? err.message : 'Routing failed';
    // A rejected fetch (CORS-less rate-limit response, offline, blocked) surfaces as "Failed to
    // fetch" — translate it into something actionable.
    if (/failed to fetch|networkerror|load failed/i.test(msg)) {
      throw new Error(
        'Routing service unreachable (possibly rate-limited) — wait a few seconds and try again.',
      );
    }
    throw err instanceof Error ? err : new Error('Routing failed');
  }
}

export async function requestRouteDirect(
  waypoints: readonly LngLat[],
  options: RouteFetchOptions = {},
  signal?: AbortSignal,
): Promise<RouteAnalysis> {
  return (await requestRoutesDirect(waypoints, options, signal))[0] as RouteAnalysis;
}

export async function requestPoisDirect(bbox: Bbox, signal?: AbortSignal): Promise<Poi[]> {
  const b = `(${bbox.south},${bbox.west},${bbox.north},${bbox.east})`;
  const query =
    `[out:json][timeout:25];(` +
    `node["tourism"="alpine_hut"]${b};` +
    `node["tourism"="camp_site"]${b};` +
    `node["tourism"="hotel"]${b};` +
    `node["tourism"="guest_house"]${b};` +
    `node["tourism"="viewpoint"]${b};` +
    `node["natural"="spring"]${b};` +
    `node["natural"="peak"]${b};` +
    `node["natural"="waterfall"]${b};` +
    `node["waterway"="waterfall"]${b};` +
    `);out body;`;
  try {
    const res = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ data: query }).toString(),
      signal,
    });
    if (!res.ok) throw new Error(`Overpass responded ${res.status}`);
    return parseOverpassPois(await res.json());
  } catch (err) {
    if (signal?.aborted) throw err;
    return parseOverpassPois(synthPoisResponse(bbox));
  }
}

export async function requestRadarDirect(signal?: AbortSignal): Promise<RainViewerMaps> {
  const res = await fetch(RAINVIEWER_URL, { signal });
  if (!res.ok) throw new Error(`RainViewer responded ${res.status}`);
  return RainViewerMapsSchema.parse(await res.json());
}
