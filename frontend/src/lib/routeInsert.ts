import { haversineMeters, type LngLat } from './geo';

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

export interface RouteSegment {
  /** Waypoint index at which to insert (splice position) — i.e. between stop `insertAt-1` and `insertAt`. */
  insertAt: number;
  /** Route-vertex range of the hovered leg (for highlighting). */
  segStart: number;
  segEnd: number;
}

/**
 * Given the snapped route geometry, the ordered stops, and a hovered point on the route, find
 * which leg (between two consecutive stops) the hover falls on — so a new stop can be inserted
 * there. Works by locating each stop's nearest route vertex and the hover's nearest vertex, then
 * picking the leg whose vertex range contains it. Returns null when there aren't ≥2 of each.
 */
export function segmentForHover(
  routePoints: readonly LngLat[],
  waypoints: readonly LngLat[],
  hover: LngLat,
): RouteSegment | null {
  if (waypoints.length < 2 || routePoints.length < 2) return null;

  const wpVertex = waypoints.map((wp) => nearestVertex(routePoints, wp));
  const hv = nearestVertex(routePoints, hover);

  for (let k = 0; k < wpVertex.length - 1; k++) {
    const a = wpVertex[k] as number;
    const b = wpVertex[k + 1] as number;
    if (hv >= Math.min(a, b) && hv <= Math.max(a, b)) {
      return { insertAt: k + 1, segStart: a, segEnd: b };
    }
  }

  // Hover fell outside every stop's vertex range (rare) — attach to the nearest leg boundary.
  const last = wpVertex.length - 1;
  if (hv <= (wpVertex[0] as number)) {
    return { insertAt: 1, segStart: wpVertex[0] as number, segEnd: wpVertex[1] as number };
  }
  return {
    insertAt: last,
    segStart: wpVertex[last - 1] as number,
    segEnd: wpVertex[last] as number,
  };
}
