import { getRoutes } from './dataClient';
import { analyzeRoute, type RouteAnalysis } from '../lib/route';
import { sampleWaypoints } from '../lib/trailGeometry';
import { chunkWaypoints } from '../lib/routeChunks';
import { orsProfile } from '../lib/routingOptions';
import { haversineMeters, type LngLat } from '../lib/geo';

/** ORS accepts ~50 coordinates per request; stay just under. */
const MAX_COORDS_PER_REQUEST = 48;
/** Density of the routing sample: one point per ~5 km keeps the snapped line on the real trail. */
const KM_PER_ROUTING_POINT = 5;
const MIN_ROUTING_POINTS = 12;
const MAX_ROUTING_POINTS = 400;
/** How many chunk requests may run at once (ORS fair-use). */
const CHUNK_CONCURRENCY = 2;

function totalKm(points: readonly LngLat[]): number {
  let m = 0;
  for (let i = 1; i < points.length; i++)
    m += haversineMeters(points[i - 1] as LngLat, points[i] as LngLat);
  return m / 1000;
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

/**
 * Snap an imported trail's raw geometry to the routing graph FAITHFULLY: sample it densely (so the
 * snapped line follows the real path, not a coarse shortcut), route it in chunks under the router's
 * coordinate limit, then stitch the chunk geometries into one analysis (real distance + elevation +
 * Tobler time). Returns null on any failure so the caller can fall back to a sparse re-snap.
 */
export async function importHikeRoute(
  polyline: readonly LngLat[],
  avoidRoads: boolean,
  signal?: AbortSignal,
): Promise<RouteAnalysis | null> {
  if (polyline.length < 2) return null;

  const km = totalKm(polyline);
  const count = Math.min(
    MAX_ROUTING_POINTS,
    Math.max(MIN_ROUTING_POINTS, Math.round(km / KM_PER_ROUTING_POINT)),
  );
  const dense = sampleWaypoints(polyline, count);
  const chunks = chunkWaypoints(dense, MAX_COORDS_PER_REQUEST);

  try {
    const analyses = await mapLimit(chunks, CHUNK_CONCURRENCY, (chunk) =>
      getRoutes(chunk, { profile: orsProfile(avoidRoads) }, signal).then((r) => r[0] ?? null),
    );
    const coords: number[][] = [];
    for (const a of analyses) {
      if (!a) continue;
      const pts = a.points.map((p) => [p.lng, p.lat, p.ele]);
      // Drop the seam vertex (shared with the previous chunk) when concatenating.
      coords.push(...(coords.length ? pts.slice(1) : pts));
    }
    return coords.length >= 2 ? analyzeRoute(coords) : null;
  } catch {
    return null;
  }
}
