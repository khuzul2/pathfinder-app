import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { analyzeRoute, formatDistance, formatDuration } from './route';
import { OrsRouteResponseSchema } from '../contracts/ors';

const ors = OrsRouteResponseSchema.parse(
  JSON.parse(
    readFileSync(resolve(process.cwd(), 'test/fixtures/ors-foot-hiking.geojson'), 'utf-8'),
  ),
);
const feature = ors.features[0]!;
const coords = feature.geometry.coordinates;
const surface = feature.properties.extras?.surface?.values;

describe('analyzeRoute — golden route (ORS fixture)', () => {
  const result = analyzeRoute(coords, surface as [number, number, number][] | undefined);

  it('produces one output point per input vertex, starting at distance 0', () => {
    expect(result.points).toHaveLength(coords.length);
    expect(result.points[0]!.distanceMeters).toBe(0);
  });

  it('has a monotonically increasing cumulative distance in a sane band', () => {
    const dists = result.points.map((p) => p.distanceMeters);
    for (let i = 1; i < dists.length; i++) expect(dists[i]!).toBeGreaterThan(dists[i - 1]!);
    expect(result.distanceMeters).toBeGreaterThan(450);
    expect(result.distanceMeters).toBeLessThan(750);
  });

  it('computes ascent ≈ the 520→553 m gain (monotone climb), ~zero descent', () => {
    expect(result.ascentMeters).toBeCloseTo(32.9, 1);
    expect(result.descentMeters).toBeCloseTo(0, 5);
  });

  it('estimates a plausible on-foot moving time', () => {
    // ~0.6 km with a gentle climb → a few minutes, well under an hour.
    expect(result.movingSeconds).toBeGreaterThan(300);
    expect(result.movingSeconds).toBeLessThan(1800);
  });
});

describe('analyzeRoute — edge cases', () => {
  it('handles a single coordinate', () => {
    const r = analyzeRoute([[11, 48, 500]]);
    expect(r.points).toHaveLength(1);
    expect(r.distanceMeters).toBe(0);
    expect(r.movingSeconds).toBe(0);
  });

  it('handles empty input', () => {
    const r = analyzeRoute([]);
    expect(r.points).toHaveLength(0);
  });
});

describe('formatting', () => {
  it('formats distance in m and km', () => {
    expect(formatDistance(640)).toBe('640 m');
    expect(formatDistance(2500)).toBe('2.5 km');
  });

  it('formats duration in h/m/s', () => {
    expect(formatDuration(45)).toBe('45s');
    expect(formatDuration(600)).toBe('10 min');
    expect(formatDuration(3720)).toBe('1h 2m');
  });
});
