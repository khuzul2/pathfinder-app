import { OrsRouteResponseSchema } from '../contracts/ors';
import { analyzeRoute, type RouteAnalysis } from './route';
import type { LngLat } from './geo';

/**
 * Request a snapped foot-hiking route from the proxy and analyze it. The AbortSignal (wired
 * by TanStack Query) cancels superseded in-flight requests so a stale route can't overwrite
 * a newer one. The server injects the ORS key; this never sees it.
 */
export async function requestRoute(
  waypoints: readonly LngLat[],
  signal?: AbortSignal,
): Promise<RouteAnalysis> {
  const res = await fetch('/api/route', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ coordinates: waypoints.map((w) => [w.lng, w.lat]) }),
    signal,
  });
  if (!res.ok) {
    throw new Error(`route request failed (${res.status})`);
  }
  const parsed = OrsRouteResponseSchema.parse(await res.json());
  const feature = parsed.features[0];
  if (!feature) throw new Error('route response contained no features');
  return analyzeRoute(feature.geometry.coordinates, feature.properties.extras?.surface?.values);
}
