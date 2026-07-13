import { describe, it, expect } from 'vitest';
import { gammaForSegment, type OrsExtraTriple } from './surfaceFactor';
import { DEFAULT_SURFACE_GAMMA, SURFACE_GAMMA } from './constants';

// [start, end, code]: segments 0–1 are asphalt (code 3 → 1.0); 2–3 are dirt (code 11 → 0.8).
const surface: OrsExtraTriple[] = [
  [0, 2, 3],
  [2, 4, 11],
];

describe('gammaForSegment', () => {
  it('maps ORS surface codes to γ per covering triple', () => {
    expect(gammaForSegment(0, surface)).toBe(SURFACE_GAMMA[3]); // asphalt 1.0
    expect(gammaForSegment(1, surface)).toBe(SURFACE_GAMMA[3]);
    expect(gammaForSegment(2, surface)).toBe(SURFACE_GAMMA[11]); // dirt 0.8
    expect(gammaForSegment(3, surface)).toBe(SURFACE_GAMMA[11]);
  });

  it('falls back to the default γ when no surface info is given', () => {
    expect(gammaForSegment(0)).toBe(DEFAULT_SURFACE_GAMMA);
  });

  it('falls back to the default γ for a segment no triple covers', () => {
    expect(gammaForSegment(9, surface)).toBe(DEFAULT_SURFACE_GAMMA);
  });

  it('falls back to the default γ for an unknown code', () => {
    expect(gammaForSegment(0, [[0, 2, 999]])).toBe(DEFAULT_SURFACE_GAMMA);
  });
});
