import type { Bbox } from './poiApi';
import type { LngLat } from './geo';

export interface CorridorOptions {
  /** Hard ceiling on the number of tiles (bounds how many upstream queries a long route triggers). */
  maxTiles: number;
  /** Padding (degrees) added around each tile, so shelters just off the corridor are covered. */
  padDeg: number;
  /** Max span (degrees) of a tile before the route is split — keeps each Overpass query small/fast. */
  maxTileSpanDeg: number;
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

/** Walk the route, closing a tile whenever its bbox would exceed `spanDeg` in lat or lng. */
function walk(points: readonly LngLat[], spanDeg: number, padDeg: number): Bbox[] {
  const tiles: Bbox[] = [];
  let start = 0;
  while (start < points.length - 1) {
    let minLat = (points[start] as LngLat).lat;
    let maxLat = minLat;
    let minLng = (points[start] as LngLat).lng;
    let maxLng = minLng;
    let end = start;
    while (end + 1 < points.length) {
      const p = points[end + 1] as LngLat;
      const nMinLat = Math.min(minLat, p.lat);
      const nMaxLat = Math.max(maxLat, p.lat);
      const nMinLng = Math.min(minLng, p.lng);
      const nMaxLng = Math.max(maxLng, p.lng);
      if (nMaxLat - nMinLat > spanDeg || nMaxLng - nMinLng > spanDeg) break;
      minLat = nMinLat;
      maxLat = nMaxLat;
      minLng = nMinLng;
      maxLng = nMaxLng;
      end++;
    }
    if (end === start) end = start + 1; // always make progress, even across a big jump
    tiles.push(paddedBbox(points.slice(start, end + 1), padDeg));
    start = end; // consecutive tiles share the seam vertex
  }
  return tiles;
}

/**
 * Split a route into bounding-box "tiles" that follow its corridor, each bounded to ~`maxTileSpanDeg`
 * so no single Overpass query covers a huge (slow/timing-out) area — the bug that left the straight
 * French/Italian legs of a long route with no shelters. The tile count adapts to the route; if it
 * would exceed `maxTiles`, the span is grown until it fits (a longer route accepts slightly larger
 * tiles rather than firing unbounded queries).
 */
export function corridorTiles(points: readonly LngLat[], opts: CorridorOptions): Bbox[] {
  if (points.length === 0) return [];
  if (points.length === 1) return [paddedBbox(points, opts.padDeg)];

  let span = opts.maxTileSpanDeg;
  let tiles = walk(points, span, opts.padDeg);
  // Grow the span (bounded iterations) until the query count is within budget.
  for (let i = 0; i < 6 && tiles.length > opts.maxTiles; i++) {
    span *= 1.6;
    tiles = walk(points, span, opts.padDeg);
  }
  return tiles;
}
