import { describe, it, expect } from 'vitest';
import { mercatorToLngLat } from './webMercator';

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
