import { mercatorToLngLat } from './webMercator';
import type { LngLat, Waypoint } from './geo';

/** Stops an imported trail becomes: enough to hold the line, few enough for one ORS snap. */
export const TRAIL_IMPORT_STOPS = 28;

/**
 * Recursively collect the primary route geometry from a Waymarked Trails route detail and reproject
 * it to WGS84. The detail is a superroute hierarchy: internal nodes carry a `main` array of child
 * routes, leaves carry a `ways` array whose `geometry.coordinates` are Web Mercator LineStrings. We
 * follow the `main` chain (skipping `appendices`, which are alternates) so the result is the through
 * route in order. Written defensively — a missing/renamed field just yields fewer points, never a throw.
 */
export function flattenTrailGeometry(route: unknown): LngLat[] {
  const out: LngLat[] = [];

  const walk = (node: unknown): void => {
    if (!node || typeof node !== 'object') return;
    const n = node as Record<string, unknown>;

    const ways = n.ways;
    if (Array.isArray(ways)) {
      for (const w of ways) {
        const coords = (w as { geometry?: { coordinates?: unknown } })?.geometry?.coordinates;
        if (!Array.isArray(coords)) continue;
        for (const c of coords) {
          if (Array.isArray(c) && typeof c[0] === 'number' && typeof c[1] === 'number') {
            out.push(mercatorToLngLat(c[0], c[1]));
          }
        }
      }
    }

    const main = n.main;
    if (Array.isArray(main)) for (const child of main) walk(child);
  };

  walk(route);
  return out;
}

/**
 * Evenly downsample a dense polyline to at most `max` points (always keeping the two ends) and turn
 * them into stops. Importing a trail as a handful of on-route stops lets the normal routing engine
 * re-snap it — enriching the bare track with elevation + Tobler time — and keeps it editable.
 * The first stop carries `name` so the imported route gets a sensible title.
 */
export function sampleWaypoints(points: readonly LngLat[], max: number, name?: string): Waypoint[] {
  if (points.length === 0) return [];
  const n = Math.max(2, max);

  let picked: LngLat[];
  if (points.length <= n) {
    picked = [...points];
  } else {
    picked = [];
    const step = (points.length - 1) / (n - 1);
    for (let i = 0; i < n; i++) picked.push(points[Math.round(i * step)] as LngLat);
  }

  return picked.map((p, i) => ({
    lng: p.lng,
    lat: p.lat,
    ...(i === 0 && name ? { name } : {}),
  }));
}
