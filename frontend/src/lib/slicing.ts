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
  /** True when this leg falls outside the user's desired hours/day band (shorter or longer). */
  outsideRange?: boolean;
}

export interface SlicePlan {
  days: DaySegment[];
  warnings: string[];
}

export interface SliceOptions {
  targetSeconds?: number;
  capSeconds?: number;
  /** Lower edge of the desired hours/day band; days shorter than this are flagged `outsideRange`. */
  minSeconds?: number;
  /** Upper edge of the desired hours/day band; when set it is the (soft) cap and the DP aims mid-band. */
  maxSeconds?: number;
  bufferMeters?: number;
  /** Allow ending a day anywhere on the route (a wild camp) when no shelter sits near the ideal. */
  allowBivvy?: boolean;
}

/** A synthetic "wild camp" stop at a route vertex (used when bivvying is allowed). */
function bivvyAt(points: readonly RoutePoint[], index: number): Shelter {
  const p = points[index] as RoutePoint;
  return { id: `bivvy-${index}`, name: 'Wild camp', kind: 'bivvy', lng: p.lng, lat: p.lat };
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
  band?: { min: number; max: number },
): DaySegment {
  const s = points[start] as RoutePoint;
  const e = points[end] as RoutePoint;
  const movingSeconds = e.timeSeconds - s.timeSeconds;
  return {
    index,
    startIndex: start,
    endIndex: end,
    movingSeconds,
    distanceMeters: e.distanceMeters - s.distanceMeters,
    shelterAtEnd: shelter,
    outsideRange: band ? movingSeconds > band.max + 1 || movingSeconds < band.min - 1 : false,
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
  // Range mode: when the caller gives a min/max band, aim for the middle of it and treat the max as
  // the (soft) cap. Legacy callers still pass targetSeconds/capSeconds and behave exactly as before.
  const hasBand = options.minSeconds != null || options.maxSeconds != null;
  const cap = options.capSeconds ?? options.maxSeconds ?? SLICING.maxHoursPerDay * 3600;
  const min = options.minSeconds ?? 0;
  const max = options.maxSeconds ?? cap;
  const target =
    options.targetSeconds ?? (hasBand ? (min + max) / 2 : SLICING.targetHoursPerDay * 3600);
  const band = hasBand ? { min, max } : undefined;
  const buffer = options.bufferMeters ?? SLICING.shelterBufferMeters;

  if (points.length < 2) return { days: [], warnings: ['Route is too short to slice.'] };

  const lastIndex = points.length - 1;
  const total = (points[lastIndex] as RoutePoint).timeSeconds;

  if (total <= cap) {
    return { days: [makeDay(0, 0, lastIndex, points, null, band)], warnings: [] };
  }

  const allowBivvy = options.allowBivvy ?? false;
  const candidates = matchSheltersToRoute(points, shelters, buffer);
  const shelterByIndex = new Map(candidates.map((c) => [c.pointIndex, c.shelter]));

  // Candidate day-boundaries: shelters only, or (when bivvying) every interior vertex so a
  // wild camp can fall at the ideal spacing wherever no shelter is near.
  const boundarySet = new Set<number>([0, lastIndex]);
  if (allowBivvy) {
    for (let i = 1; i < lastIndex; i++) boundarySet.add(i);
  } else {
    for (const c of candidates) boundarySet.add(c.pointIndex);
  }
  const boundaries = [...boundarySet].sort((a, b) => a - b);

  // A small penalty for a bivvy overnight biases the DP toward a real shelter within ~20% of
  // the ideal day length, falling back to a wild camp only when none is close.
  const bivvyPenalty = (target * 0.2) ** 2;

  const n = boundaries.length;

  /**
   * DP over the candidate boundaries minimizing Σ(dayTime − target)². `hardCap` skips any day over
   * the cap (the ideal); when that leaves no legal split, a second SOFT pass instead penalizes
   * over-cap days so the route is still broken at the reachable shelters (walking to the next one)
   * rather than collapsing to a single unusable leg. Returns the chosen boundary indices, or null.
   */
  const solve = (hardCap: boolean): number[] | null => {
    const dp: number[] = new Array<number>(n).fill(Infinity);
    const prev: number[] = new Array<number>(n).fill(-1);
    dp[0] = 0;
    for (let j = 1; j < n; j++) {
      const bj = boundaries[j] as number;
      const isBivvyOvernight = bj !== lastIndex && !shelterByIndex.has(bj);
      for (let i = 0; i < j; i++) {
        const from = points[boundaries[i] as number] as RoutePoint;
        const to = points[bj] as RoutePoint;
        const dayTime = to.timeSeconds - from.timeSeconds;
        if (hardCap && dayTime > cap) continue;
        const overCap = !hardCap && dayTime > cap ? (dayTime - cap) ** 2 : 0;
        const cost =
          (dp[i] as number) +
          (dayTime - target) ** 2 +
          (isBivvyOvernight ? bivvyPenalty : 0) +
          overCap;
        if (cost < (dp[j] as number)) {
          dp[j] = cost;
          prev[j] = i;
        }
      }
    }
    if (!Number.isFinite(dp[n - 1] as number)) return null;
    const chosen: number[] = [];
    for (let k = n - 1; k >= 0; k = prev[k] as number) {
      chosen.push(boundaries[k] as number);
      if (k === 0) break;
    }
    return chosen.reverse();
  };

  const chosen = solve(true) ?? solve(false);
  if (!chosen) {
    return { days: [makeDay(0, 0, lastIndex, points, null, band)], warnings: [] };
  }

  const days: DaySegment[] = [];
  for (let d = 0; d < chosen.length - 1; d++) {
    const start = chosen[d] as number;
    const end = chosen[d + 1] as number;
    const shelter =
      end === lastIndex
        ? null
        : (shelterByIndex.get(end) ?? (allowBivvy ? bivvyAt(points, end) : null));
    days.push(makeDay(d, start, end, points, shelter, band));
  }

  const warnings: string[] = [];
  if (days.some((d) => d.movingSeconds > cap)) {
    warnings.push(
      candidates.length === 0
        ? 'No shelters within reach keep every day under the limit — some days run long.'
        : 'No shelter is reachable within some days — they exceed the daily limit.',
    );
  }
  return { days, warnings };
}
