import { requestRoutes } from '../lib/routeApi';
import { requestPois, POI_KINDS, type Poi, type Bbox, type PoiKind } from '../lib/poiApi';
import { RainViewerMapsSchema, type RainViewerMaps } from '../contracts/rainviewer';
import { requestRoutesDirect, requestPoisDirect, requestRadarDirect } from '../demo/directApi';
import type { LngLat } from '../lib/geo';
import type { RouteAnalysis } from '../lib/route';
import type { RouteFetchOptions } from '../lib/routingOptions';

/**
 * Single seam for upstream data. In the public demo we call upstreams directly from the
 * browser; in production we go through the secure backend proxy. Everything downstream
 * (hooks, components) is identical either way.
 */
const DEMO = import.meta.env.VITE_DEMO === '1';

/** The recommended route first, followed by any alternatives (empty extras for a single route). */
export function getRoutes(
  waypoints: readonly LngLat[],
  options: RouteFetchOptions = {},
  signal?: AbortSignal,
): Promise<RouteAnalysis[]> {
  return DEMO
    ? requestRoutesDirect(waypoints, options, signal)
    : requestRoutes(waypoints, options, signal);
}

export function getPois(
  bbox: Bbox,
  kinds: readonly PoiKind[] = POI_KINDS,
  signal?: AbortSignal,
): Promise<Poi[]> {
  return DEMO ? requestPoisDirect(bbox, kinds, signal) : requestPois(bbox, kinds, signal);
}

export async function getRadar(signal?: AbortSignal): Promise<RainViewerMaps> {
  if (DEMO) return requestRadarDirect(signal);
  const res = await fetch('/api/radar', { signal });
  if (!res.ok) throw new Error(`radar request failed (${res.status})`);
  return RainViewerMapsSchema.parse(await res.json());
}
