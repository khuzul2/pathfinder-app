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

/**
 * Request the route(s) directly from ORS: for a simple start→end pair we also ask for
 * `alternative_routes`, returning the recommended route first then any alternatives. Alternatives
 * are best-effort — if the request is rejected we retry with just the primary route, then fall
 * back to a synthetic route so the demo always renders something.
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
  const body =
    coordinates.length === 2
      ? { ...base, alternative_routes: { target_count: 3, share_factor: 0.6, weight_factor: 1.6 } }
      : base;

  try {
    const res = await postOrs(profile, body, signal);
    if (res.ok) return toRouteAnalyses(await res.json());
    // Some deployments reject alternative_routes — retry once with only the primary route.
    if (body !== base) {
      const retry = await postOrs(profile, base, signal);
      if (retry.ok) return toRouteAnalyses(await retry.json());
    }
    throw new Error(`ORS responded ${res.status}`);
  } catch (err) {
    if (signal?.aborted) throw err;
    return [toRouteAnalysis(synthRouteResponse(coordinates))];
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
    `node["natural"="spring"]${b};` +
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
