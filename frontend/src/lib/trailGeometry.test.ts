import { describe, it, expect } from 'vitest';
import { flattenTrailGeometry, sampleWaypoints } from './trailGeometry';
import type { LngLat } from './geo';

describe('flattenTrailGeometry', () => {
  it('collects leaf ways down the main chain and reprojects to WGS84', () => {
    const route = {
      main: [
        {
          main: [
            {
              ways: [
                {
                  geometry: {
                    coordinates: [
                      [0, 0],
                      [1258941.22, 5786980.66],
                    ],
                  },
                },
              ],
            },
          ],
        },
        {
          ways: [{ geometry: { coordinates: [[20037508.342789244, 0]] } }],
        },
      ],
    };
    const pts = flattenTrailGeometry(route);
    expect(pts).toHaveLength(3);
    expect(pts[0]!.lng).toBeCloseTo(0, 6);
    expect(pts[1]!.lng).toBeCloseTo(11.31, 2);
    expect(pts[2]!.lng).toBeCloseTo(180, 6); // half-circumference → 180°E
  });

  it('ignores appendices and malformed nodes without throwing', () => {
    const route = {
      main: [{ ways: [{ geometry: { coordinates: [[0, 0]] } }] }],
      appendices: [{ ways: [{ geometry: { coordinates: [[1000, 1000]] } }] }],
    };
    expect(flattenTrailGeometry(route)).toHaveLength(1);
    expect(flattenTrailGeometry(null)).toEqual([]);
    expect(flattenTrailGeometry({ main: [{ ways: [{}] }] })).toEqual([]);
  });
});

describe('sampleWaypoints', () => {
  const line: LngLat[] = Array.from({ length: 100 }, (_, i) => ({ lng: i, lat: 0 }));

  it('downsamples to at most max points, keeping both ends', () => {
    const wps = sampleWaypoints(line, 10);
    expect(wps.length).toBe(10);
    expect(wps[0]).toMatchObject({ lng: 0 });
    expect(wps[wps.length - 1]).toMatchObject({ lng: 99 });
  });

  it('keeps a short line as-is and names the first stop', () => {
    const wps = sampleWaypoints(
      [
        { lng: 1, lat: 1 },
        { lng: 2, lat: 2 },
      ],
      28,
      'TransLagorai',
    );
    expect(wps).toHaveLength(2);
    expect(wps[0]!.name).toBe('TransLagorai');
    expect(wps[1]!.name).toBeUndefined();
  });

  it('returns [] for an empty polyline', () => {
    expect(sampleWaypoints([], 28)).toEqual([]);
  });
});
