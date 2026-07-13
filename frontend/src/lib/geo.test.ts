import { describe, it, expect } from 'vitest';
import {
  toRadians,
  haversineMeters,
  cumulativeHorizontalDistances,
  formatGpxCoordinate,
  type LngLat,
} from './geo';

describe('toRadians', () => {
  it('converts degrees to radians', () => {
    expect(toRadians(180)).toBeCloseTo(Math.PI, 10);
    expect(toRadians(0)).toBe(0);
  });
});

describe('haversineMeters', () => {
  it('is zero for identical points', () => {
    const p: LngLat = { lng: 11.5761, lat: 48.1374 };
    expect(haversineMeters(p, p)).toBe(0);
  });

  it('matches a known short Munich-area distance (~600 m)', () => {
    // 11.5761,48.1374 -> 11.5820,48.1402 (the blueprint's own example coordinates).
    const d = haversineMeters({ lng: 11.5761, lat: 48.1374 }, { lng: 11.582, lat: 48.1402 });
    expect(d).toBeGreaterThan(500);
    expect(d).toBeLessThan(700);
  });

  it('is symmetric', () => {
    const a: LngLat = { lng: 0, lat: 0 };
    const b: LngLat = { lng: 1, lat: 1 };
    expect(haversineMeters(a, b)).toBeCloseTo(haversineMeters(b, a), 6);
  });

  it('approximates one degree of latitude as ~111 km', () => {
    const d = haversineMeters({ lng: 0, lat: 0 }, { lng: 0, lat: 1 });
    expect(d).toBeGreaterThan(110_000);
    expect(d).toBeLessThan(112_000);
  });
});

describe('cumulativeHorizontalDistances', () => {
  it('returns [] for an empty polyline', () => {
    expect(cumulativeHorizontalDistances([])).toEqual([]);
  });

  it('returns [0] for a single point', () => {
    expect(cumulativeHorizontalDistances([{ lng: 1, lat: 1 }])).toEqual([0]);
  });

  it('accumulates monotonically and starts at 0', () => {
    const pts: LngLat[] = [
      { lng: 0, lat: 0 },
      { lng: 0, lat: 0.01 },
      { lng: 0, lat: 0.02 },
    ];
    const cum = cumulativeHorizontalDistances(pts);
    expect(cum).toHaveLength(3);
    expect(cum[0]).toBe(0);
    expect(cum[1]).toBeGreaterThan(0);
    expect(cum[2]).toBeGreaterThan(cum[1]!);
  });
});

describe('formatGpxCoordinate', () => {
  it('formats to 6 decimal places with a dot separator', () => {
    expect(formatGpxCoordinate(11.5761)).toBe('11.576100');
    expect(formatGpxCoordinate(-0.5)).toBe('-0.500000');
  });

  it('throws on non-finite values', () => {
    expect(() => formatGpxCoordinate(Number.NaN)).toThrow(RangeError);
    expect(() => formatGpxCoordinate(Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });
});
