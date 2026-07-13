import { haversineMeters, type LngLat } from './geo';
import type { RoutePoint } from './route';
import { SLICING } from './constants';

export interface Shelter extends LngLat {
  id: string;
  name?: string;
  kind: string;
}

export interface ShelterCandidate {
  /** Index into the route's points where this shelter is nearest. */
  pointIndex: number;
  shelter: Shelter;
  /** Approx cross-track distance (m) from the route to the shelter. */
  offsetMeters: number;
}

export interface DaySegment {
  index: number;
  startIndex: number;
  endIndex: number;
  movingSeconds: number;
  distanceMeters: number;
  /** The shelter this day ends at (null for the final day, which ends at the route end). */
  shelterAtEnd: Shelter | null;
}

export interface SlicePlan {
  days: DaySegment[];
  warnings: string[];
}

export interface SliceOptions {
  targetSeconds?: number;
  capSeconds?: number;
  bufferMeters?: number;
}

/**
 * Match shelters to the route by nearest vertex within `bufferMeters` (a cross-track
 * approximation that is exact enough on ORS-dense geometry). Only interior vertices qualify
 * (a stop can't be the start or the end). Deduped by vertex, keeping the closest shelter.
 */
export function matchSheltersToRoute(
  points: readonly RoutePoint[],
  shelters: readonly Shelter[],
  bufferMeters: number = SLICING.shelterBufferMeters,
): ShelterCandidate[] {
  const byIndex = new Map<number, ShelterCandidate>();
  for (const shelter of shelters) {
    let bestIdx = -1;
    let bestDist = Infinity;
    for (let i = 0; i < points.length; i++) {
      const d = haversineMeters(points[i] as RoutePoint, shelter);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    if (bestIdx > 0 && bestIdx < points.length - 1 && bestDist <= bufferMeters) {
      const existing = byIndex.get(bestIdx);
      if (!existing || bestDist < existing.offsetMeters) {
        byIndex.set(bestIdx, { pointIndex: bestIdx, shelter, offsetMeters: bestDist });
      }
    }
  }
  return [...byIndex.values()].sort((a, b) => a.pointIndex - b.pointIndex);
}

function makeDay(
  index: number,
  start: number,
  end: number,
  points: readonly RoutePoint[],
  shelter: Shelter | null,
): DaySegment {
  const s = points[start] as RoutePoint;
  const e = points[end] as RoutePoint;
  return {
    index,
    startIndex: start,
    endIndex: end,
    movingSeconds: e.timeSeconds - s.timeSeconds,
    distanceMeters: e.distanceMeters - s.distanceMeters,
    shelterAtEnd: shelter,
  };
}

/**
 * Slice a route into daily legs by MOVING TIME (ADR-002). A dynamic program chooses the
 * subset of reachable shelters that minimizes Σ(dayTime − target)² subject to every day
 * ≤ cap. Falls back to a single leg (with a warning) when the whole route fits in one day
 * or when no shelters make a legal split possible (the common alpine case).
 */
export function planDays(
  points: readonly RoutePoint[],
  shelters: readonly Shelter[],
  options: SliceOptions = {},
): SlicePlan {
  const target = options.targetSeconds ?? SLICING.targetHoursPerDay * 3600;
  const cap = options.capSeconds ?? SLICING.maxHoursPerDay * 3600;
  const buffer = options.bufferMeters ?? SLICING.shelterBufferMeters;

  if (points.length < 2) return { days: [], warnings: ['Route is too short to slice.'] };

  const lastIndex = points.length - 1;
  const total = (points[lastIndex] as RoutePoint).timeSeconds;

  if (total <= cap) {
    return { days: [makeDay(0, 0, lastIndex, points, null)], warnings: [] };
  }

  const candidates = matchSheltersToRoute(points, shelters, buffer);
  const shelterByIndex = new Map(candidates.map((c) => [c.pointIndex, c.shelter]));
  const boundaries = [...new Set([0, ...candidates.map((c) => c.pointIndex), lastIndex])].sort(
    (a, b) => a - b,
  );

  const n = boundaries.length;
  const dp: number[] = new Array<number>(n).fill(Infinity);
  const prev: number[] = new Array<number>(n).fill(-1);
  dp[0] = 0;

  for (let j = 1; j < n; j++) {
    for (let i = 0; i < j; i++) {
      const from = points[boundaries[i] as number] as RoutePoint;
      const to = points[boundaries[j] as number] as RoutePoint;
      const dayTime = to.timeSeconds - from.timeSeconds;
      if (dayTime > cap) continue;
      const cost = (dp[i] as number) + (dayTime - target) ** 2;
      if (cost < (dp[j] as number)) {
        dp[j] = cost;
        prev[j] = i;
      }
    }
  }

  if (!Number.isFinite(dp[n - 1] as number)) {
    return {
      days: [makeDay(0, 0, lastIndex, points, null)],
      warnings: [
        'No shelters within reach keep every day under the limit — showing the whole route as one leg.',
      ],
    };
  }

  const chosen: number[] = [];
  for (let k = n - 1; k >= 0; k = prev[k] as number) {
    chosen.push(boundaries[k] as number);
    if (k === 0) break;
  }
  chosen.reverse();

  const days: DaySegment[] = [];
  for (let d = 0; d < chosen.length - 1; d++) {
    const start = chosen[d] as number;
    const end = chosen[d + 1] as number;
    const shelter = end === lastIndex ? null : (shelterByIndex.get(end) ?? null);
    days.push(makeDay(d, start, end, points, shelter));
  }
  return { days, warnings: [] };
}
