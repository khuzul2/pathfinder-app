import { toRouteAnalysis } from '../lib/routeApi';
import { parseOverpassPois, type Poi, type Bbox } from '../lib/poiApi';
import { RainViewerMapsSchema, type RainViewerMaps } from '../contracts/rainviewer';
import { synthRouteResponse, synthPoisResponse } from './synth';
import type { RouteAnalysis } from '../lib/route';
import type { LngLat } from '../lib/geo';

/**
 * DEMO-mode data source: call the real upstreams directly from the browser (no backend).
 * Overpass and RainViewer are keyless; ORS needs `VITE_ORS_API_KEY` (embedded in the public
 * bundle by design — ADR-009 decision). If the ORS key is absent or a call fails, fall back
 * to the synthetic responses so the site keeps working. In production these paths are unused
 * (`dataClient` routes through the backend proxy instead).
 */
const ORS_KEY = import.meta.env.VITE_ORS_API_KEY;
const ORS_URL = 'https://api.openrouteservice.org/v2/directions/foot-hiking/geojson';
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const RAINVIEWER_URL = 'https://api.rainviewer.com/public/weather-maps.json';

export async function requestRouteDirect(
  waypoints: readonly LngLat[],
  signal?: AbortSignal,
): Promise<RouteAnalysis> {
  const coordinates = waypoints.map((w): [number, number] => [w.lng, w.lat]);
  if (!ORS_KEY) return toRouteAnalysis(synthRouteResponse(coordinates));
  try {
    const res = await fetch(ORS_URL, {
      method: 'POST',
      headers: {
        Authorization: ORS_KEY,
        'Content-Type': 'application/json',
        Accept: 'application/geo+json',
      },
      body: JSON.stringify({
        coordinates,
        elevation: true,
        extra_info: ['surface', 'traildifficulty', 'steepness'],
      }),
      signal,
    });
    if (!res.ok) throw new Error(`ORS responded ${res.status}`);
    return toRouteAnalysis(await res.json());
  } catch (err) {
    if (signal?.aborted) throw err;
    return toRouteAnalysis(synthRouteResponse(coordinates));
  }
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
