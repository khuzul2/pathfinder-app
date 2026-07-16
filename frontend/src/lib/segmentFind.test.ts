import { describe, it, expect } from 'vitest';
import { findPoiOnSegment, type SegmentPoi } from './segmentFind';
import type { LngLat } from './geo';

// A straight north-running route, ~100 m between vertices (lng 0, lat step ~0.000899°).
const route: LngLat[] = Array.from({ length: 11 }, (_, i) => ({ lng: 0, lat: i * 0.000899 }));

const M = 1 / 111_320; // ~metres → degrees at the equator (lng and lat here, cos≈1)
const poi = (id: string, vertexIndex: number, east = 0, north = 0): SegmentPoi => ({
  id,
  kind: 'alpine_hut',
  lat: vertexIndex * 0.000899 + north * M,
  lng: east * M,
});

describe('findPoiOnSegment', () => {
  it('returns null for a degenerate segment or no candidates', () => {
    expect(findPoiOnSegment(route, 3, 3, [poi('a', 3, 100)], 500)).toBeNull();
    expect(findPoiOnSegment(route, 2, 8, [], 500)).toBeNull();
  });

  it('rejects a POI far off the leg (bounding-box prefilter)', () => {
    expect(findPoiOnSegment(route, 2, 8, [poi('far', 5, 900)], 500)).toBeNull();
  });

  it('rejects a near-corner POI that is within the bbox but beyond the cross-track radius', () => {
    // ~400 m east AND ~400 m past the leg end → inside the padded bbox but ~566 m from any vertex.
    expect(findPoiOnSegment(route, 2, 8, [poi('corner', 8, 400, 400)], 500)).toBeNull();
  });

  it('finds a POI sitting on the leg within the radius', () => {
    const found = findPoiOnSegment(route, 2, 8, [poi('near', 5, 200)], 500);
    expect(found?.poi.id).toBe('near');
    expect(found?.vertexIndex).toBe(5);
  });

  it('prefers the candidate nearest the middle of the leg', () => {
    const found = findPoiOnSegment(route, 2, 8, [poi('end', 8, 100), poi('middle', 5, 100)], 500);
    expect(found?.poi.id).toBe('middle');
  });

  it('is order-independent in the segment bounds', () => {
    expect(findPoiOnSegment(route, 8, 2, [poi('near', 5, 100)], 500)?.poi.id).toBe('near');
  });
});
