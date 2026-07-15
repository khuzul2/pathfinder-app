import { describe, it, expect } from 'vitest';
import { corridorTiles } from './routeCorridor';
import type { LngLat } from './geo';

const opts = { maxTiles: 20, padDeg: 0.01, maxTileSpanDeg: 1 };

function spanOf(b: { south: number; west: number; north: number; east: number }, pad = 0.01) {
  return { lat: b.north - b.south - 2 * pad, lng: b.east - b.west - 2 * pad };
}

describe('corridorTiles', () => {
  it('returns a single padded tile for a short route', () => {
    const pts: LngLat[] = [
      { lng: 11.0, lat: 46.0 },
      { lng: 11.2, lat: 46.1 },
    ];
    const tiles = corridorTiles(pts, opts);
    expect(tiles).toHaveLength(1);
    expect(tiles[0]!.west).toBeCloseTo(10.99, 5);
  });

  it('bounds each tile to ~maxTileSpanDeg on a long straight route', () => {
    // ~30° west→east line → many ~1° tiles, but capped at maxTiles.
    const pts: LngLat[] = Array.from({ length: 300 }, (_, i) => ({ lng: i * 0.1, lat: 45 }));
    const tiles = corridorTiles(pts, opts);
    expect(tiles.length).toBeGreaterThan(1);
    expect(tiles.length).toBeLessThanOrEqual(20);
    // Every tile stays within ~maxTileSpanDeg (allowing for the seam-vertex overshoot + grown span).
    tiles.forEach((t) => {
      const s = spanOf(t);
      expect(s.lng).toBeLessThanOrEqual(2.1);
    });
    // Coverage: first tile at the start, last tile at the end.
    expect(tiles[0]!.west).toBeLessThan(0.2);
    expect(tiles[tiles.length - 1]!.east).toBeGreaterThan(29.7);
  });

  it('grows the span rather than exceeding maxTiles', () => {
    const pts: LngLat[] = Array.from({ length: 400 }, (_, i) => ({ lng: i * 0.1, lat: 45 })); // 40°
    const tiles = corridorTiles(pts, { maxTiles: 8, padDeg: 0.01, maxTileSpanDeg: 1 });
    expect(tiles.length).toBeLessThanOrEqual(8);
    expect(tiles[tiles.length - 1]!.east).toBeGreaterThan(39.7); // still covers the end
  });

  it('handles empty / single-point input', () => {
    expect(corridorTiles([], opts)).toEqual([]);
    expect(corridorTiles([{ lng: 5, lat: 5 }], opts)).toHaveLength(1);
  });
});
