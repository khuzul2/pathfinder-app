import { requestRoute } from '../lib/routeApi';
import { requestPois, type Poi, type Bbox } from '../lib/poiApi';
import { RainViewerMapsSchema, type RainViewerMaps } from '../contracts/rainviewer';
import { requestRouteDirect, requestPoisDirect, requestRadarDirect } from '../demo/directApi';
import type { LngLat } from '../lib/geo';
import type { RouteAnalysis } from '../lib/route';

/**
 * Single seam for upstream data. In the public demo we call upstreams directly from the
 * browser; in production we go through the secure backend proxy. Everything downstream
 * (hooks, components) is identical either way.
 */
const DEMO = import.meta.env.VITE_DEMO === '1';

export function getRoute(
  waypoints: readonly LngLat[],
  signal?: AbortSignal,
): Promise<RouteAnalysis> {
  return DEMO ? requestRouteDirect(waypoints, signal) : requestRoute(waypoints, signal);
}

export function getPois(bbox: Bbox, signal?: AbortSignal): Promise<Poi[]> {
  return DEMO ? requestPoisDirect(bbox, signal) : requestPois(bbox, signal);
}

export async function getRadar(signal?: AbortSignal): Promise<RainViewerMaps> {
  if (DEMO) return requestRadarDirect(signal);
  const res = await fetch('/api/radar', { signal });
  if (!res.ok) throw new Error(`radar request failed (${res.status})`);
  return RainViewerMapsSchema.parse(await res.json());
}
