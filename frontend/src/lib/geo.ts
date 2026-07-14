/**
 * Pure geospatial helpers — the SEEDED REFERENCE VERTICAL for the loop.
 *
 * This module is fully implemented and fully tested on purpose: it demonstrates the
 * house style the loop's test-author/fixer imitate (pure functions, exhaustive unit
 * tests, no I/O, no `any`). Every subsequent lib module (tobler, elevation, gpx,
 * slicing) is built the same way — test-first — by the loop. See docs/SPEC.md §2.3.
 */

/** IUGG mean Earth radius (metres). */
const EARTH_RADIUS_M = 6_371_008.8;

export interface LngLat {
  lng: number;
  lat: number;
}

/** A route stop: a point plus an optional human label (a searched place, or blank for a map pin). */
export interface Waypoint extends LngLat {
  name?: string;
}

export function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Great-circle HORIZONTAL distance between two lng/lat points, in metres (haversine).
 * Horizontal by construction — this is the dX that feeds Tobler's slope tangent, never
 * a 3D segment length (which would understate steep alpine grades).
 */
export function haversineMeters(a: LngLat, b: LngLat): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Cumulative horizontal distance (metres) at each vertex along a polyline.
 * Result has the same length as the input; result[0] is always 0.
 */
export function cumulativeHorizontalDistances(points: readonly LngLat[]): number[] {
  const out: number[] = [];
  let acc = 0;
  let prev: LngLat | undefined;
  for (const point of points) {
    if (prev !== undefined) {
      acc += haversineMeters(prev, point);
    }
    out.push(acc);
    prev = point;
  }
  return out;
}

/**
 * Format a coordinate for GPX output: 6 decimal places, '.' decimal separator,
 * locale-independent. Guards against NaN/Infinity leaking into the XML.
 */
export function formatGpxCoordinate(value: number): string {
  if (!Number.isFinite(value)) {
    throw new RangeError(`Coordinate must be finite, received ${value}`);
  }
  return value.toFixed(6);
}
