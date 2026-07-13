import { describe, it, expect } from 'vitest';
import {
  resampleByDistance,
  smoothElevations,
  segmentSlopes,
  ascentDescent,
  polylineLength,
  type ElevPoint,
} from './elevation';

// ~100 m north of the origin (1° lat ≈ 111.2 km → 100 m ≈ 0.000899°).
const P0: ElevPoint = { lng: 0, lat: 0, ele: 0 };
const P100: ElevPoint = { lng: 0, lat: 0.000899, ele: 100 };

describe('resampleByDistance', () => {
  it('returns the input unchanged for < 2 points', () => {
    expect(resampleByDistance([P0])).toEqual([P0]);
  });

  it('splits a ~100 m line into ~25 m steps and preserves the endpoint', () => {
    const out = resampleByDistance([P0, P100], 25);
    expect(out.length).toBe(5); // 0,25,50,75 + endpoint
    expect(out[0]!.ele).toBeCloseTo(0, 3);
    expect(out.at(-1)!.ele).toBeCloseTo(100, 3);
    expect(out[1]!.ele).toBeGreaterThan(20); // ~25
    expect(out[1]!.ele).toBeLessThan(30);
  });
});

describe('smoothElevations', () => {
  it('moving-averages the elevation with a shrinking edge window', () => {
    const pts: ElevPoint[] = [
      { lng: 0, lat: 0, ele: 0 },
      { lng: 0, lat: 1, ele: 10 },
      { lng: 0, lat: 2, ele: 20 },
    ];
    const out = smoothElevations(pts, 3);
    expect(out[0]!.ele).toBeCloseTo(5, 6); // (0+10)/2
    expect(out[1]!.ele).toBeCloseTo(10, 6); // (0+10+20)/3
    expect(out[2]!.ele).toBeCloseTo(15, 6); // (10+20)/2
  });
});

describe('segmentSlopes', () => {
  it('computes dh/dx per segment', () => {
    const slopes = segmentSlopes([P0, P100]); // 100 m up over ~100 m → ~1.0, clamped to 0.6
    expect(slopes).toHaveLength(1);
    expect(slopes[0]).toBeCloseTo(0.6, 6); // clamped
  });

  it('clamps absurd slopes to ±0.6', () => {
    const spike: ElevPoint[] = [
      { lng: 0, lat: 0, ele: 0 },
      { lng: 0, lat: 0.000001, ele: 500 }, // tiny dx, huge dh
    ];
    expect(segmentSlopes(spike)[0]).toBe(0.6);
  });
});

describe('ascentDescent', () => {
  it('sums positive and negative elevation deltas separately', () => {
    const pts: ElevPoint[] = [
      { lng: 0, lat: 0, ele: 0 },
      { lng: 0, lat: 1, ele: 10 },
      { lng: 0, lat: 2, ele: 5 },
      { lng: 0, lat: 3, ele: 20 },
    ];
    expect(ascentDescent(pts)).toEqual({ ascent: 25, descent: 5 });
  });
});

describe('polylineLength', () => {
  it('approximates the horizontal length', () => {
    expect(polylineLength([P0, P100])).toBeGreaterThan(95);
    expect(polylineLength([P0, P100])).toBeLessThan(105);
  });
});
