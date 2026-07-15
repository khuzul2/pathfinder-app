import { describe, it, expect } from 'vitest';
import { corridorTiles } from './routeCorridor';
import type { LngLat } from './geo';

const opts = { maxTiles: 10, padDeg: 0.01, tileSpanDeg: 1 };

describe('corridorTiles', () => {
  it('returns a single padded tile for a short route', () => {
    const pts: LngLat[] = [
      { lng: 11.0, lat: 46.0 },
      { lng: 11.2, lat: 46.1 },
    ];
    const tiles = corridorTiles(pts, opts);
    expect(tiles).toHaveLength(1);
    expect(tiles[0]!.west).toBeCloseTo(10.99, 5); // padded by 0.01
    expect(tiles[0]!.east).toBeCloseTo(11.21, 5);
  });

  it('splits a long route into multiple tiles, capped at maxTiles', () => {
    // A ~30° west→east line → would be 30 tiles at 1°/tile, but capped at 10.
    const pts: LngLat[] = Array.from({ length: 300 }, (_, i) => ({ lng: i * 0.1, lat: 45 }));
    const tiles = corridorTiles(pts, opts);
    expect(tiles.length).toBeGreaterThan(1);
    expect(tiles.length).toBeLessThanOrEqual(10);
    // Tiles together span the whole route (first covers the start, last covers the end).
    expect(tiles[0]!.west).toBeLessThan(0.1);
    expect(tiles[tiles.length - 1]!.east).toBeGreaterThan(29.8);
  });

  it('handles empty / single-point input', () => {
    expect(corridorTiles([], opts)).toEqual([]);
    expect(corridorTiles([{ lng: 5, lat: 5 }], opts)).toHaveLength(1);
  });
});
