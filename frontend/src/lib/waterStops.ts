import { haversineMeters, type LngLat, type Waypoint } from './geo';
import type { RoutePoint } from './route';
import type { SlicePlan } from './slicing';

/** A day already "has water" if a spring lies within this distance of its route. */
const ON_ROUTE_METERS = 150;
/** Don't detour more than this to reach a water source for a dry day. */
const MAX_DETOUR_METERS = 3000;
/** A spring already covered by a nearby stop is skipped (idempotent re-runs). */
const DEDUPE_METERS = 40;

export interface SpringLike extends LngLat {
  id: string;
  name?: string;
}

export interface WaterInsertion {
  waypoints: Waypoint[];
  /** How many water stops were newly inserted (0 = every day already passes water). */
  inserted: number;
}

/** Index of the route vertex nearest `target`. */
function nearestVertex(points: readonly LngLat[], target: LngLat): number {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < points.length; i++) {
    const d = haversineMeters(points[i] as LngLat, target);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}

/**
 * Ensure the route passes a water source at least once per day: for each sliced day that doesn't
 * already run within ~150 m of a spring, insert the nearest reachable spring (≤3 km detour) as a
 * stop on that day's leg so the route is rebuilt through it. Idempotent — a spring already covered
 * by a nearby stop is skipped, so the action self-hides once every day has water (no reroute loop).
 */
export function insertWaterStops(
  routePoints: readonly RoutePoint[],
  waypoints: readonly Waypoint[],
  plan: SlicePlan,
  springs: readonly SpringLike[],
): WaterInsertion {
  if (waypoints.length < 2 || routePoints.length < 2 || springs.length === 0) {
    return { waypoints: [...waypoints], inserted: 0 };
  }

  const wpVertex = waypoints.map((wp) => nearestVertex(routePoints, wp));
  const lastPos = waypoints.length - 1;
  const usedSpringIds = new Set<string>();
  const insertions: { spring: SpringLike; pos: number }[] = [];

  for (const day of plan.days) {
    const { startIndex, endIndex } = day;

    const dayHasWater = springs.some((sp) => {
      for (let i = startIndex; i <= endIndex; i++) {
        if (haversineMeters(routePoints[i] as LngLat, sp) <= ON_ROUTE_METERS) return true;
      }
      return false;
    });
    if (dayHasWater) continue;

    let best: SpringLike | null = null;
    let bestDist = MAX_DETOUR_METERS;
    let bestVertex = startIndex;
    for (const sp of springs) {
      if (usedSpringIds.has(sp.id)) continue;
      for (let i = startIndex; i <= endIndex; i++) {
        const d = haversineMeters(routePoints[i] as LngLat, sp);
        if (d < bestDist) {
          bestDist = d;
          best = sp;
          bestVertex = i;
        }
      }
    }
    if (!best) continue;
    if (waypoints.some((w) => haversineMeters(w, best as SpringLike) < DEDUPE_METERS)) continue;

    usedSpringIds.add(best.id);
    const before = wpVertex.filter((v) => v < bestVertex).length;
    insertions.push({ spring: best, pos: Math.min(Math.max(before, 1), lastPos) });
  }

  const result: Waypoint[] = [];
  for (let w = 0; w <= waypoints.length; w++) {
    for (const { spring } of insertions.filter((i) => i.pos === w)) {
      result.push({ lng: spring.lng, lat: spring.lat, name: spring.name ?? 'Water source' });
    }
    if (w < waypoints.length) result.push(waypoints[w] as Waypoint);
  }
  return { waypoints: result, inserted: insertions.length };
}
