import { describe, it, expect } from 'vitest';
import { SURFACE_GAMMA, DEFAULT_SURFACE_GAMMA, TOBLER, SLICING } from './constants';

// Locks the confirmed constant table as the oracle. If a human revises a γ factor after
// reading the source image, they update BOTH the value and this test — deliberately.
describe('SURFACE_GAMMA table', () => {
  it('covers ORS surface codes 0..18 contiguously', () => {
    for (let code = 0; code <= 18; code++) {
      expect(SURFACE_GAMMA[code], `missing γ for surface code ${code}`).toBeTypeOf('number');
    }
  });

  it('every γ is a velocity multiplier in (0, 1]', () => {
    for (const [code, gamma] of Object.entries(SURFACE_GAMMA)) {
      expect(gamma, `γ for code ${code}`).toBeGreaterThan(0);
      expect(gamma, `γ for code ${code}`).toBeLessThanOrEqual(1);
    }
    expect(DEFAULT_SURFACE_GAMMA).toBeGreaterThan(0);
    expect(DEFAULT_SURFACE_GAMMA).toBeLessThanOrEqual(1);
  });

  it('paved surfaces (paved/asphalt/concrete/paving-stones) are the 1.0 baseline', () => {
    for (const code of [1, 3, 4, 14]) {
      expect(SURFACE_GAMMA[code], `code ${code} should be baseline`).toBe(1);
    }
  });

  it('technical surfaces are slower than paved', () => {
    // Ice and sand must never be as fast as a paved path.
    expect(SURFACE_GAMMA[13]).toBeLessThan(1);
    expect(SURFACE_GAMMA[15]).toBeLessThan(1);
  });
});

describe('TOBLER parameters', () => {
  it('match the canonical Tobler form', () => {
    expect(TOBLER.baseSpeedKmh).toBe(6);
    expect(TOBLER.k).toBe(3.5);
    expect(TOBLER.offset).toBe(0.05);
  });
});

describe('SLICING defaults', () => {
  it('keep a day under its hard cap and inflate for breaks', () => {
    expect(SLICING.minHoursPerDay).toBeLessThanOrEqual(SLICING.targetHoursPerDay);
    expect(SLICING.targetHoursPerDay).toBeLessThanOrEqual(SLICING.maxHoursPerDay);
    expect(SLICING.breakFactor).toBeGreaterThan(1);
    expect(SLICING.shelterBufferMeters).toBeGreaterThan(0);
  });
});
