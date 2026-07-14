import { OrsRouteResponseSchema } from '../contracts/ors';
import { analyzeRoute, type RouteAnalysis } from './route';
import type { LngLat } from './geo';
import type { RouteFetchOptions } from './routingOptions';

/** Validate a raw ORS geojson response and analyze EVERY feature (recommended + alternatives). */
export function toRouteAnalyses(json: unknown): RouteAnalysis[] {
  const parsed = OrsRouteResponseSchema.parse(json);
  return parsed.features.map((feature) => {
    const extras = feature.properties.extras;
    return analyzeRoute(
      feature.geometry.coordinates,
      extras?.surface?.values,
      extras?.traildifficulty?.values,
    );
  });
}

/** Validate a raw ORS geojson response and turn its first feature into a RouteAnalysis. */
export function toRouteAnalysis(json: unknown): RouteAnalysis {
  const first = toRouteAnalyses(json)[0];
  if (!first) throw new Error('route response contained no features');
  return first;
}

/**
 * Request a snapped foot-hiking route from the backend proxy and analyze it. The AbortSignal
 * (wired by TanStack Query) cancels superseded in-flight requests so a stale route can't
 * overwrite a newer one. The server injects the ORS key; this never sees it. (In the public
 * demo, `services/dataClient` calls ORS directly instead — see that module.)
 */
export async function requestRoute(
  waypoints: readonly LngLat[],
  options: RouteFetchOptions = {},
  signal?: AbortSignal,
): Promise<RouteAnalysis> {
  return (await requestRoutes(waypoints, options, signal))[0]!;
}

/**
 * Like `requestRoute`, but asks the proxy for alternative routes (only meaningful for a simple
 * start→end pair) and returns the recommended route first followed by any alternatives.
 */
export async function requestRoutes(
  waypoints: readonly LngLat[],
  options: RouteFetchOptions = {},
  signal?: AbortSignal,
): Promise<RouteAnalysis[]> {
  const body: Record<string, unknown> = { coordinates: waypoints.map((w) => [w.lng, w.lat]) };
  if (options.profile) body.profile = options.profile;
  if (waypoints.length === 2) body.alternatives = true;
  const res = await fetch('/api/route', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) {
    throw new Error(`route request failed (${res.status})`);
  }
  return toRouteAnalyses(await res.json());
}
