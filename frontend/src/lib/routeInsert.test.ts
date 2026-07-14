import { describe, it, expect } from 'vitest';
import { segmentForHover } from './routeInsert';
import type { LngLat } from './geo';

// A straight north-running route: 11 vertices, ~100 m apart.
const routePoints: LngLat[] = Array.from({ length: 11 }, (_, i) => ({ lng: 0, lat: i * 0.000899 }));

describe('segmentForHover', () => {
  it('returns null without ≥2 stops or route points', () => {
    expect(segmentForHover(routePoints, [{ lng: 0, lat: 0 }], { lng: 0, lat: 0 })).toBeNull();
    expect(
      segmentForHover(
        [],
        [
          { lng: 0, lat: 0 },
          { lng: 0, lat: 1 },
        ],
        { lng: 0, lat: 0 },
      ),
    ).toBeNull();
  });

  it('inserts between the two stops of a simple A→B route', () => {
    const stops: LngLat[] = [routePoints[0]!, routePoints[10]!];
    const seg = segmentForHover(routePoints, stops, routePoints[5]!);
    expect(seg).toEqual({ insertAt: 1, segStart: 0, segEnd: 10 });
  });

  it('picks the correct leg on a 3-stop route', () => {
    const stops: LngLat[] = [routePoints[0]!, routePoints[5]!, routePoints[10]!];
    // Hovering vertex 2 (first leg) → insert at index 1.
    expect(segmentForHover(routePoints, stops, routePoints[2]!)!.insertAt).toBe(1);
    // Hovering vertex 8 (second leg) → insert at index 2.
    expect(segmentForHover(routePoints, stops, routePoints[8]!)!.insertAt).toBe(2);
  });
});
