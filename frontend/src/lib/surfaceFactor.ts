import { SURFACE_GAMMA, DEFAULT_SURFACE_GAMMA } from './constants';

/** ORS `extra_info.*` triple: [startVertexIdx, endVertexIdx, code]. */
export type OrsExtraTriple = [number, number, number];

/**
 * γ velocity multiplier for the segment between vertices `segIndex` and `segIndex + 1`,
 * from the ORS surface triples. Falls back to the default γ when no triple covers it
 * (or when surface info is absent). See SPEC §2.4.
 */
export function gammaForSegment(
  segIndex: number,
  surfaceValues?: readonly OrsExtraTriple[],
): number {
  if (!surfaceValues) return DEFAULT_SURFACE_GAMMA;
  for (const [start, end, code] of surfaceValues) {
    if (segIndex >= start && segIndex < end) {
      return SURFACE_GAMMA[code] ?? DEFAULT_SURFACE_GAMMA;
    }
  }
  return DEFAULT_SURFACE_GAMMA;
}
