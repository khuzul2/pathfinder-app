import { describe, it, expect } from 'vitest';
import { synthRouteResponse, synthPoisResponse } from './synth';
import { OrsRouteResponseSchema } from '../contracts/ors';
import { OverpassResponseSchema } from '../contracts/overpass';
import { analyzeRoute } from '../lib/route';
import { parseOverpassPois, sheltersFrom } from '../lib/poiApi';

describe('synthRouteResponse', () => {
  const raw = synthRouteResponse([
    [11.4, 47.25],
    [11.45, 47.3],
  ]);

  it('matches the ORS geojson contract', () => {
    expect(OrsRouteResponseSchema.safeParse(raw).success).toBe(true);
  });

  it('produces a route the real analyzer can summarize (distance + varied elevation)', () => {
    const parsed = OrsRouteResponseSchema.parse(raw);
    const feature = parsed.features[0]!;
    const analysis = analyzeRoute(
      feature.geometry.coordinates,
      feature.properties.extras?.surface?.values,
    );
    expect(analysis.distanceMeters).toBeGreaterThan(1000);
    expect(analysis.ascentMeters).toBeGreaterThan(0);
    expect(analysis.movingSeconds).toBeGreaterThan(0);
    expect(analysis.points.length).toBeGreaterThan(20);
  });
});

describe('synthPoisResponse', () => {
  const bbox = { south: 47.2, west: 11.3, north: 47.4, east: 11.5 };
  const raw = synthPoisResponse(bbox);

  it('matches the Overpass contract and stays within the bbox', () => {
    const parsed = OverpassResponseSchema.parse(raw);
    expect(parsed.elements.length).toBeGreaterThan(0);
    for (const el of parsed.elements) {
      expect(el.lat!).toBeGreaterThanOrEqual(bbox.south);
      expect(el.lat!).toBeLessThanOrEqual(bbox.north);
      expect(el.lon!).toBeGreaterThanOrEqual(bbox.west);
      expect(el.lon!).toBeLessThanOrEqual(bbox.east);
    }
  });

  it('yields overnight shelters (huts + campsites)', () => {
    const shelters = sheltersFrom(parseOverpassPois(raw));
    expect(shelters.length).toBeGreaterThanOrEqual(2);
  });
});
