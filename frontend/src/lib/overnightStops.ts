import { haversineMeters, type LngLat, type Waypoint } from './geo';
import type { RoutePoint } from './route';
import type { SlicePlan } from './slicing';

/** A stop within this many metres of a chosen shelter already covers it (idempotent re-runs). */
const DEDUPE_METERS = 40;

/** Index of the route vertex nearest `target` (route vertices are ordered along the path). */
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

export interface OvernightInsertion {
  /** The stop list with each day's overnight shelter inserted in route order. */
  waypoints: Waypoint[];
  /** How many shelters were newly inserted (0 = the route already passes through them). */
  inserted: number;
}

/**
 * Merge the day-slicer's chosen overnight shelters into the stop list so the route can be rebuilt
 * to pass THROUGH them. Each non-final day ends at a real shelter (bivvy/wild-camps are skipped —
 * they already sit on the route); that shelter is inserted between the two user stops that bracket
 * it along the route. A shelter already represented by a nearby stop is skipped, so re-running is
 * idempotent (no duplicate stops, and therefore no reroute→reslice→reinsert loop).
 */
export function insertOvernightStops(
  routePoints: readonly RoutePoint[],
  waypoints: readonly Waypoint[],
  plan: SlicePlan,
): OvernightInsertion {
  if (waypoints.length < 2 || routePoints.length < 2) {
    return { waypoints: [...waypoints], inserted: 0 };
  }

  const wpVertex = waypoints.map((wp) => nearestVertex(routePoints, wp));
  const lastPos = waypoints.length - 1;

  // Each non-final day's real shelter → the stop slot it belongs in (strictly between start & end),
  // in route order. Wild camps (bivvy) already lie on the route, so they never need re-routing.
  const insertions = plan.days
    .filter((d) => d.shelterAtEnd != null && d.shelterAtEnd.kind !== 'bivvy')
    .map((d) => {
      const shelter = d.shelterAtEnd!;
      const before = wpVertex.filter((v) => v < d.endIndex).length;
      const pos = Math.min(Math.max(before, 1), lastPos); // never before the start / after the end
      return { shelter, pos };
    })
    .filter(({ shelter }) => !waypoints.some((w) => haversineMeters(w, shelter) < DEDUPE_METERS));

  const result: Waypoint[] = [];
  for (let k = 0; k <= waypoints.length; k++) {
    for (const { shelter } of insertions.filter((i) => i.pos === k)) {
      result.push({ lng: shelter.lng, lat: shelter.lat, name: shelter.name ?? 'Overnight stop' });
    }
    if (k < waypoints.length) result.push(waypoints[k] as Waypoint);
  }

  return { waypoints: result, inserted: insertions.length };
}
