import { haversineMeters, type LngLat } from './geo';
import { ELEVATION_SAMPLING } from './constants';

export interface ElevPoint {
  lng: number;
  lat: number;
  ele: number;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Resample a polyline to ~uniform horizontal spacing (metres), linearly interpolating
 * lng/lat/ele. The final vertex is always preserved. Reduces slope sensitivity to the
 * irregular vertex spacing ORS returns (SPEC §2.3).
 */
export function resampleByDistance(
  points: readonly ElevPoint[],
  spacing: number = ELEVATION_SAMPLING.resampleSpacingMeters,
): ElevPoint[] {
  if (points.length < 2) return points.map((p) => ({ ...p }));

  const cumulative: number[] = [0];
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1] as ElevPoint;
    const curr = points[i] as ElevPoint;
    cumulative.push((cumulative[i - 1] as number) + haversineMeters(prev, curr));
  }
  const total = cumulative[cumulative.length - 1] as number;
  if (total === 0) return [{ ...(points[0] as ElevPoint) }];

  const out: ElevPoint[] = [];
  let seg = 0;
  for (let target = 0; target < total; target += spacing) {
    while (seg < points.length - 2 && (cumulative[seg + 1] as number) < target) seg++;
    const segStart = cumulative[seg] as number;
    const segEnd = cumulative[seg + 1] as number;
    const a = points[seg] as ElevPoint;
    const b = points[seg + 1] as ElevPoint;
    const t = segEnd > segStart ? (target - segStart) / (segEnd - segStart) : 0;
    out.push({
      lng: lerp(a.lng, b.lng, t),
      lat: lerp(a.lat, b.lat, t),
      ele: lerp(a.ele, b.ele, t),
    });
  }
  out.push({ ...(points[points.length - 1] as ElevPoint) });
  return out;
}

/** Moving-average smooth the elevation series over an odd window (edges shrink the window). */
export function smoothElevations(
  points: readonly ElevPoint[],
  window: number = ELEVATION_SAMPLING.smoothingWindow,
): ElevPoint[] {
  if (window <= 1) return points.map((p) => ({ ...p }));
  const half = Math.floor(window / 2);
  return points.map((point, i) => {
    let sum = 0;
    let count = 0;
    for (let j = Math.max(0, i - half); j <= Math.min(points.length - 1, i + half); j++) {
      sum += (points[j] as ElevPoint).ele;
      count += 1;
    }
    return { ...point, ele: sum / count };
  });
}

/** Per-segment slope tangent (dh/dx), clamped to ±maxAbsSlope; length is points.length - 1. */
export function segmentSlopes(points: readonly ElevPoint[]): number[] {
  const slopes: number[] = [];
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1] as ElevPoint;
    const curr = points[i] as ElevPoint;
    const dx = haversineMeters(prev, curr);
    const slope = dx > 0 ? (curr.ele - prev.ele) / dx : 0;
    slopes.push(clamp(slope, -ELEVATION_SAMPLING.maxAbsSlope, ELEVATION_SAMPLING.maxAbsSlope));
  }
  return slopes;
}

/** Total ascent and descent (metres) along the elevation series. */
export function ascentDescent(points: readonly ElevPoint[]): { ascent: number; descent: number } {
  let ascent = 0;
  let descent = 0;
  for (let i = 1; i < points.length; i++) {
    const delta = (points[i] as ElevPoint).ele - (points[i - 1] as ElevPoint).ele;
    if (delta > 0) ascent += delta;
    else descent -= delta;
  }
  return { ascent, descent };
}

/** Horizontal length (metres) of a polyline. */
export function polylineLength(points: readonly LngLat[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += haversineMeters(points[i - 1] as LngLat, points[i] as LngLat);
  }
  return total;
}
