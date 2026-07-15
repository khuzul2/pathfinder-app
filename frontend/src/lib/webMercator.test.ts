import { describe, it, expect } from 'vitest';
import { mercatorToLngLat, lngLatToMercator } from './webMercator';

describe('mercatorToLngLat', () => {
  it('maps the origin to lng/lat 0,0', () => {
    const { lng, lat } = mercatorToLngLat(0, 0);
    expect(lng).toBeCloseTo(0, 6);
    expect(lat).toBeCloseTo(0, 6);
  });

  it('reprojects a known reference point (90°E, 45°N)', () => {
    // Web Mercator (10018754.17, 5621521.49) is exactly lng 90°, lat 45°.
    const { lng, lat } = mercatorToLngLat(10018754.171, 5621521.486);
    expect(lng).toBeCloseTo(90, 4);
    expect(lat).toBeCloseTo(45, 4);
  });
});

describe('lngLatToMercator', () => {
  it('round-trips with mercatorToLngLat', () => {
    const cases: Array<[number, number]> = [
      [11.35, 46.06],
      [-73.99, 40.73],
      [0, 0],
    ];
    for (const [lng, lat] of cases) {
      const { x, y } = lngLatToMercator(lng, lat);
      const back = mercatorToLngLat(x, y);
      expect(back.lng).toBeCloseTo(lng, 6);
      expect(back.lat).toBeCloseTo(lat, 6);
    }
  });
});
