import { haversineMeters, type LngLat } from './geo';

/** A candidate place (shelter or water source) that can be pulled onto a route leg as a stop. */
export interface SegmentPoi extends LngLat {
  id: string;
  name?: string;
  kind: string;
}

export interface SegmentFind {
  poi: SegmentPoi;
  /** Route vertex the POI attaches to (used to order/position the inserted stop). */
  vertexIndex: number;
}

/**
 * Among `pois`, find the one that lies on the route leg spanning vertices `[segStart, segEnd]`
 * (order-independent) — i.e. within `maxMeters` cross-track of some vertex in that range — and is
 * closest to the MIDDLE of the leg, so an inserted stay splits the leg rather than hugging an
 * existing stop. Returns the chosen POI and its attach vertex, or null when none is within reach.
 *
 * Drives the on-map "find overnight stay / find water source" handles: hover a leg, and if a
 * matching place sits along it, the handle offers to drop it in as a stop. A cheap bounding-box
 * prefilter (padded by `maxMeters`) keeps the per-hover cost low on long routes.
 */
export function findPoiOnSegment(
  routePoints: readonly LngLat[],
  segStart: number,
  segEnd: number,
  pois: readonly SegmentPoi[],
  maxMeters: number,
): SegmentFind | null {
  const lo = Math.max(0, Math.min(segStart, segEnd));
  const hi = Math.min(routePoints.length - 1, Math.max(segStart, segEnd));
  if (hi - lo < 1 || pois.length === 0) return null;

  // Leg bounding box, padded by the search radius, for a cheap first-pass reject.
  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  for (let i = lo; i <= hi; i++) {
    const p = routePoints[i] as LngLat;
    if (p.lng < minLng) minLng = p.lng;
    if (p.lng > maxLng) maxLng = p.lng;
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
  }
  const midLat = (minLat + maxLat) / 2;
  const latPad = maxMeters / 111_320;
  const lngPad = maxMeters / (111_320 * Math.max(0.1, Math.cos((midLat * Math.PI) / 180)));

  const mid = (lo + hi) / 2;
  let best: SegmentFind | null = null;
  let bestMidDist = Infinity;
  for (const poi of pois) {
    if (
      poi.lng < minLng - lngPad ||
      poi.lng > maxLng + lngPad ||
      poi.lat < minLat - latPad ||
      poi.lat > maxLat + latPad
    ) {
      continue;
    }
    let nearestVertex = -1;
    let nearestDist = Infinity;
    for (let i = lo; i <= hi; i++) {
      const d = haversineMeters(routePoints[i] as LngLat, poi);
      if (d < nearestDist) {
        nearestDist = d;
        nearestVertex = i;
      }
    }
    if (nearestDist > maxMeters) continue;
    const midDist = Math.abs(nearestVertex - mid);
    if (midDist < bestMidDist) {
      bestMidDist = midDist;
      best = { poi, vertexIndex: nearestVertex };
    }
  }
  return best;
}
