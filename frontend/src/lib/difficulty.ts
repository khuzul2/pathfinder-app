import type { OrsExtraTriple } from './surfaceFactor';

/**
 * Trail difficulty (SAC hiking scale) from ORS `extra_info.traildifficulty`. Codes 0–6 map to
 * the SAC T1–T6 grades; colors run green → amber → red → purple. Accepted-default calibration
 * (ADR-009). Used to color the route line and drive the difficulty legend.
 */
export interface DifficultyLevel {
  label: string;
  short: string;
  color: string;
}

export const SAC_DIFFICULTY: Readonly<Record<number, DifficultyLevel>> = {
  0: { label: 'Path (grade unknown)', short: '—', color: '#1A73E8' },
  1: { label: 'Hiking (T1)', short: 'T1', color: '#0F9D58' },
  2: { label: 'Mountain hiking (T2)', short: 'T2', color: '#7CB342' },
  3: { label: 'Demanding mountain (T3)', short: 'T3', color: '#F9AB00' },
  4: { label: 'Alpine hiking (T4)', short: 'T4', color: '#F57C00' },
  5: { label: 'Demanding alpine (T5)', short: 'T5', color: '#EA4335' },
  6: { label: 'Difficult alpine (T6)', short: 'T6', color: '#8E24AA' },
};

export function difficultyLevel(code: number): DifficultyLevel {
  return SAC_DIFFICULTY[code] ?? (SAC_DIFFICULTY[0] as DifficultyLevel);
}

export interface DifficultySegment {
  /** [lng, lat] pairs for this constant-difficulty stretch (endpoints shared with neighbors). */
  coordinates: Array<[number, number]>;
  sac: number;
  color: string;
}

/**
 * Split a route's coordinates into constant-difficulty segments from the ORS traildifficulty
 * index triples `[startVertex, endVertex, sacCode]`. With no triples, the whole route is one
 * "unknown grade" segment so it still renders.
 */
export function buildDifficultySegments(
  coordinates: ReadonlyArray<readonly number[]>,
  traildifficulty?: readonly OrsExtraTriple[],
): DifficultySegment[] {
  const toLngLat = (from: number, to: number): Array<[number, number]> =>
    coordinates.slice(from, to + 1).map((c) => [c[0] ?? 0, c[1] ?? 0]);

  if (!traildifficulty || traildifficulty.length === 0) {
    return [
      { coordinates: toLngLat(0, coordinates.length - 1), sac: 0, color: difficultyLevel(0).color },
    ];
  }

  return traildifficulty.map(([start, end, code]) => ({
    coordinates: toLngLat(start, end),
    sac: code,
    color: difficultyLevel(code).color,
  }));
}
