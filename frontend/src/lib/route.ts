import { haversineMeters } from './geo';
import { segmentSeconds } from './tobler';
import { ELEVATION_SAMPLING } from './constants';
import { ascentDescent, type ElevPoint } from './elevation';
import { gammaForSegment, type OrsExtraTriple } from './surfaceFactor';
import { buildDifficultySegments, type DifficultySegment } from './difficulty';

export interface RoutePoint {
  lng: number;
  lat: number;
  ele: number;
  /** Cumulative horizontal distance from the start (metres). */
  distanceMeters: number;
  /** Cumulative Tobler moving time from the start (seconds). */
  timeSeconds: number;
}

export interface RouteAnalysis {
  points: RoutePoint[];
  distanceMeters: number;
  ascentMeters: number;
  descentMeters: number;
  movingSeconds: number;
  /** Route split into constant SAC-difficulty stretches (for colored rendering + legend). */
  difficultySegments: DifficultySegment[];
}

const MAX_SLOPE = ELEVATION_SAMPLING.maxAbsSlope;

/**
 * Turn an ORS `[lng, lat, ele]` polyline (+ optional surface triples) into a route summary:
 * cumulative-distance points for the chart, plus total distance, ascent/descent, and Tobler
 * moving time (γ-weighted per ORS surface segment). Computed directly on the ORS vertices:
 * ORS elevation is the source of truth (SPEC §2.2) and is spatially aligned with the surface
 * triples, so `surfaceValues` map cleanly to segment indices. Slopes are clamped for
 * stability (SPEC §2.3). The resample/smooth helpers in `elevation.ts` are for dense-DEM /
 * slicing use, where per-vertex smoothing is appropriate.
 */
export function analyzeRoute(
  coordinates: readonly (readonly number[])[],
  surfaceValues?: readonly OrsExtraTriple[],
  traildifficultyValues?: readonly OrsExtraTriple[],
): RouteAnalysis {
  const raw: ElevPoint[] = coordinates.map((c) => ({
    lng: c[0] ?? 0,
    lat: c[1] ?? 0,
    ele: c[2] ?? 0,
  }));
  const difficultySegments = buildDifficultySegments(coordinates, traildifficultyValues);

  if (raw.length < 2) {
    const only = raw[0];
    return {
      points: only ? [{ ...only, distanceMeters: 0, timeSeconds: 0 }] : [],
      distanceMeters: 0,
      ascentMeters: 0,
      descentMeters: 0,
      movingSeconds: 0,
      difficultySegments,
    };
  }

  const points: RoutePoint[] = [{ ...(raw[0] as ElevPoint), distanceMeters: 0, timeSeconds: 0 }];
  let cumulative = 0;
  let movingSeconds = 0;

  for (let i = 1; i < raw.length; i++) {
    const a = raw[i - 1] as ElevPoint;
    const b = raw[i] as ElevPoint;
    const dx = haversineMeters(a, b);
    const slope = dx > 0 ? Math.min(MAX_SLOPE, Math.max(-MAX_SLOPE, (b.ele - a.ele) / dx)) : 0;
    movingSeconds += segmentSeconds(dx, slope, gammaForSegment(i - 1, surfaceValues));
    cumulative += dx;
    points.push({ ...b, distanceMeters: cumulative, timeSeconds: movingSeconds });
  }

  const { ascent, descent } = ascentDescent(raw);
  return {
    points,
    distanceMeters: cumulative,
    ascentMeters: ascent,
    descentMeters: descent,
    movingSeconds,
    difficultySegments,
  };
}

export function formatDistance(meters: number): string {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;
}

export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes} min`;
  return `${total}s`;
}
