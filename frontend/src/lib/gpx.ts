import { formatGpxCoordinate, type LngLat } from './geo';

/**
 * GPX 1.1 course serializer (SPEC §4). Emits a fully-namespaced root with correct child
 * ordering (metadata → wpt* → trk*), `<ele>` before any other trackpoint child, and NO
 * `<time>` — so COROS treats the file as a navigable COURSE, not a recorded activity. The
 * track is Douglas-Peucker simplified to stay under device course-point limits. Coordinates
 * are locale-safe (always '.'). Output validates against gpx.xsd (see gpx.test.ts).
 */

export interface GpxTrackPoint {
  lng: number;
  lat: number;
  ele?: number;
}

export interface GpxWaypoint extends GpxTrackPoint {
  name?: string;
}

export interface BuildGpxOptions {
  name?: string;
  creator?: string;
  waypoints?: readonly GpxWaypoint[];
  simplifyToleranceMeters?: number;
}

const GPX_NS = 'http://www.topografix.com/GPX/1/1';

export function escapeXml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c] as string,
  );
}

/** Perpendicular distance (m) from p to segment a→b via a local equirectangular projection. */
function perpendicularMeters(p: LngLat, a: LngLat, b: LngLat): number {
  const mPerDegLat = 110_540;
  const mPerDegLng = 111_320 * Math.cos((a.lat * Math.PI) / 180);
  const bx = (b.lng - a.lng) * mPerDegLng;
  const by = (b.lat - a.lat) * mPerDegLat;
  const px = (p.lng - a.lng) * mPerDegLng;
  const py = (p.lat - a.lat) * mPerDegLat;
  const len2 = bx * bx + by * by;
  if (len2 === 0) return Math.hypot(px, py);
  const t = Math.max(0, Math.min(1, (px * bx + py * by) / len2));
  return Math.hypot(px - t * bx, py - t * by);
}

/** Douglas-Peucker line simplification, preserving elevation on the kept vertices. */
export function simplifyTrack(
  points: readonly GpxTrackPoint[],
  toleranceMeters = 8,
): GpxTrackPoint[] {
  if (points.length <= 2) return points.map((p) => ({ ...p }));

  const keep = new Array<boolean>(points.length).fill(false);
  keep[0] = true;
  keep[points.length - 1] = true;

  const stack: Array<[number, number]> = [[0, points.length - 1]];
  while (stack.length > 0) {
    const [start, end] = stack.pop() as [number, number];
    let maxDist = 0;
    let maxIdx = -1;
    const a = points[start] as GpxTrackPoint;
    const b = points[end] as GpxTrackPoint;
    for (let i = start + 1; i < end; i++) {
      const d = perpendicularMeters(points[i] as GpxTrackPoint, a, b);
      if (d > maxDist) {
        maxDist = d;
        maxIdx = i;
      }
    }
    if (maxIdx !== -1 && maxDist > toleranceMeters) {
      keep[maxIdx] = true;
      stack.push([start, maxIdx], [maxIdx, end]);
    }
  }

  return points.filter((_, i) => keep[i]).map((p) => ({ ...p }));
}

function eleXml(ele: number | undefined): string {
  return ele === undefined ? '' : `<ele>${ele.toFixed(1)}</ele>`;
}

function trkptXml(p: GpxTrackPoint): string {
  return `<trkpt lat="${formatGpxCoordinate(p.lat)}" lon="${formatGpxCoordinate(p.lng)}">${eleXml(p.ele)}</trkpt>`;
}

function wptXml(w: GpxWaypoint): string {
  const name = w.name ? `<name>${escapeXml(w.name)}</name>` : '';
  // Child order per the schema: <ele> before <name>.
  return `  <wpt lat="${formatGpxCoordinate(w.lat)}" lon="${formatGpxCoordinate(w.lng)}">${eleXml(w.ele)}${name}</wpt>\n`;
}

export function buildGpxCourse(
  track: readonly GpxTrackPoint[],
  options: BuildGpxOptions = {},
): string {
  const creator = escapeXml(options.creator ?? 'Pathfinder');
  const name = options.name ?? 'Pathfinder Route';
  const simplified = simplifyTrack(track, options.simplifyToleranceMeters ?? 8);
  const wpts = (options.waypoints ?? []).map(wptXml).join('');
  const trkpts = simplified.map(trkptXml).join('');

  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<gpx version="1.1" creator="${creator}" xmlns="${GPX_NS}" ` +
    `xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ` +
    `xsi:schemaLocation="${GPX_NS} ${GPX_NS}/gpx.xsd">\n` +
    `  <metadata><name>${escapeXml(name)}</name></metadata>\n` +
    wpts +
    `  <trk><name>${escapeXml(name)}</name><trkseg>${trkpts}</trkseg></trk>\n` +
    `</gpx>\n`
  );
}
