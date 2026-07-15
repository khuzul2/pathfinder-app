import { requestRoutes } from '../lib/routeApi';
import { requestPois, POI_KINDS, type Poi, type Bbox, type PoiKind } from '../lib/poiApi';
import { RainViewerMapsSchema, type RainViewerMaps } from '../contracts/rainviewer';
import { requestRoutesDirect, requestPoisDirect, requestRadarDirect } from '../demo/directApi';
import { analyzeRoute, type RouteAnalysis } from '../lib/route';
import { chunkWaypoints, decimate } from '../lib/routeChunks';
import type { LngLat } from '../lib/geo';
import type { RouteFetchOptions } from '../lib/routingOptions';

/**
 * Single seam for upstream data. In the public demo we call upstreams directly from the
 * browser; in production we go through the secure backend proxy. Everything downstream
 * (hooks, components) is identical either way.
 */
const DEMO = import.meta.env.VITE_DEMO === '1';

/** ORS accepts ~50 coordinates per request; beyond this we route in chunks and stitch. */
const MAX_COORDS_PER_REQUEST = 48;
/** Cap on a stitched route's vertices so a very long trail stays responsive to render + scan. */
const MAX_ROUTE_POINTS = 2000;
const CHUNK_CONCURRENCY = 2;

function requestChunk(
  waypoints: readonly LngLat[],
  options: RouteFetchOptions,
  signal?: AbortSignal,
): Promise<RouteAnalysis[]> {
  return DEMO
    ? requestRoutesDirect(waypoints, options, signal)
    : requestRoutes(waypoints, options, signal);
}

async function mapLimit<T, R>(items: readonly T[], limit: number, fn: (item: T) => Promise<R>) {
  const results: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i] as T);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/** Route more waypoints than a single request allows by chunking, then stitch into one analysis. */
async function routeChunked(
  waypoints: readonly LngLat[],
  options: RouteFetchOptions,
  signal?: AbortSignal,
): Promise<RouteAnalysis[]> {
  const chunks = chunkWaypoints(waypoints, MAX_COORDS_PER_REQUEST);
  const analyses = await mapLimit(chunks, CHUNK_CONCURRENCY, (c) =>
    requestChunk(c, options, signal).then((r) => r[0] ?? null),
  );
  const coords: number[][] = [];
  for (const a of analyses) {
    if (!a) continue;
    const pts = a.points.map((p) => [p.lng, p.lat, p.ele]);
    coords.push(...(coords.length ? pts.slice(1) : pts)); // drop the shared seam vertex
  }
  if (coords.length < 2) throw new Error('Could not compute the full route');
  return [analyzeRoute(decimate(coords, MAX_ROUTE_POINTS))];
}

/** The recommended route first, followed by any alternatives (empty extras for a single route). */
export function getRoutes(
  waypoints: readonly LngLat[],
  options: RouteFetchOptions = {},
  signal?: AbortSignal,
): Promise<RouteAnalysis[]> {
  return waypoints.length > MAX_COORDS_PER_REQUEST
    ? routeChunked(waypoints, options, signal)
    : requestChunk(waypoints, options, signal);
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
