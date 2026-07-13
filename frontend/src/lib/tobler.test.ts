import { describe, it, expect } from 'vitest';
import { toblerSpeedKmh, effectiveSpeedKmh, segmentSeconds } from './tobler';

describe('toblerSpeedKmh', () => {
  it('peaks at 6 km/h on the optimal -0.05 downhill grade', () => {
    expect(toblerSpeedKmh(-0.05)).toBeCloseTo(6, 6);
  });

  it('gives ~5.04 km/h on the flat', () => {
    expect(toblerSpeedKmh(0)).toBeCloseTo(6 * Math.exp(-0.175), 6); // ≈5.037
  });

  it('slows on the uphill and is symmetric about the -0.05 optimum', () => {
    expect(toblerSpeedKmh(0.1)).toBeCloseTo(6 * Math.exp(-0.525), 6); // ≈3.55
    // 0.1 is 0.15 above the optimum; -0.2 is 0.15 below → equal speeds.
    expect(toblerSpeedKmh(0.1)).toBeCloseTo(toblerSpeedKmh(-0.2), 6);
  });

  it('is much slower on a steep climb', () => {
    expect(toblerSpeedKmh(0.5)).toBeLessThan(1);
  });
});

describe('effectiveSpeedKmh', () => {
  it('scales Tobler by the surface γ', () => {
    expect(effectiveSpeedKmh(0, 0.8)).toBeCloseTo(0.8 * toblerSpeedKmh(0), 6);
  });

  it('never exceeds the flat-ground max of 6 km/h', () => {
    expect(effectiveSpeedKmh(-0.05, 1)).toBeCloseTo(6, 6);
    expect(effectiveSpeedKmh(-0.05, 1)).toBeLessThanOrEqual(6);
  });
});

describe('segmentSeconds', () => {
  it('is zero for a zero-length segment', () => {
    expect(segmentSeconds(0, 0.1, 0.8)).toBe(0);
  });

  it('a flat 1 km on firm ground takes ~12 minutes', () => {
    const s = segmentSeconds(1000, 0, 1);
    expect(s).toBeGreaterThan(600); // >10 min
    expect(s).toBeLessThan(780); // <13 min
  });

  it('the same distance uphill takes longer than flat', () => {
    expect(segmentSeconds(1000, 0.2, 1)).toBeGreaterThan(segmentSeconds(1000, 0, 1));
  });

  it('rougher surface (lower γ) takes longer', () => {
    expect(segmentSeconds(1000, 0, 0.5)).toBeGreaterThan(segmentSeconds(1000, 0, 1));
  });
});
