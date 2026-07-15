import { getRoutes } from './dataClient';
import { type RouteAnalysis } from '../lib/route';
import { sampleWaypoints } from '../lib/trailGeometry';
import { orsProfile } from '../lib/routingOptions';
import { haversineMeters, type LngLat } from '../lib/geo';

/** Density of the routing sample: one point per ~5 km keeps the snapped line on the real trail. */
const KM_PER_ROUTING_POINT = 5;
const MIN_ROUTING_POINTS = 12;
const MAX_ROUTING_POINTS = 400;

function totalKm(points: readonly LngLat[]): number {
  let m = 0;
  for (let i = 1; i < points.length; i++)
    m += haversineMeters(points[i - 1] as LngLat, points[i] as LngLat);
  return m / 1000;
}

/**
 * Snap an imported trail's raw geometry to the routing graph FAITHFULLY: sample it densely (so the
 * snapped line follows the real path, not a coarse shortcut) and route it via `getRoutes`, which
 * chunks under the router's coordinate limit and stitches + decimates the result (real distance +
 * elevation + Tobler time). Returns null on any failure so the caller can fall back to a sparse
 * re-snap.
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

  try {
    const routes = await getRoutes(dense, { profile: orsProfile(avoidRoads) }, signal);
    return routes[0] ?? null;
  } catch {
    return null;
  }
}
