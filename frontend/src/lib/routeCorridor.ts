import type { Bbox } from './poiApi';
import type { LngLat } from './geo';

export interface CorridorOptions {
  /** Hard ceiling on the number of tiles (bounds how many upstream queries a long route triggers). */
  maxTiles: number;
  /** Padding (degrees) added around each tile, so shelters just off the corridor are covered. */
  padDeg: number;
  /** Target maximum span (degrees) of a tile before the route is split into more tiles. */
  tileSpanDeg: number;
}

function paddedBbox(points: readonly LngLat[], padDeg: number): Bbox {
  let south = 90;
  let north = -90;
  let west = 180;
  let east = -180;
  for (const p of points) {
    south = Math.min(south, p.lat);
    north = Math.max(north, p.lat);
    west = Math.min(west, p.lng);
    east = Math.max(east, p.lng);
  }
  return { south: south - padDeg, west: west - padDeg, north: north + padDeg, east: east + padDeg };
}

/**
 * Split a route into a small set of bounding-box "tiles" that follow its corridor, so shelters can
 * be fetched per-tile instead of over one giant (possibly continental) bbox that would time out.
 * The tile count adapts to the route's geographic span but is capped at `maxTiles` for performance;
 * consecutive tiles overlap by one vertex so no shelter falls through a seam.
 */
export function corridorTiles(points: readonly LngLat[], opts: CorridorOptions): Bbox[] {
  if (points.length === 0) return [];
  if (points.length === 1) return [paddedBbox(points, opts.padDeg)];

  const full = paddedBbox(points, 0);
  const spanDeg = Math.max(full.north - full.south, full.east - full.west);
  const nTiles = Math.min(opts.maxTiles, Math.max(1, Math.ceil(spanDeg / opts.tileSpanDeg)));
  if (nTiles === 1) return [paddedBbox(points, opts.padDeg)];

  const per = Math.ceil(points.length / nTiles);
  const tiles: Bbox[] = [];
  for (let start = 0; start < points.length; start += per) {
    const end = Math.min(points.length, start + per + 1); // +1 vertex overlap so tiles join
    tiles.push(paddedBbox(points.slice(start, end), opts.padDeg));
  }
  return tiles;
}
