import type { LngLat } from './geo';

/** Web Mercator (EPSG:3857) half-extent in metres: π · 6378137. */
const HALF_CIRCUMFERENCE = 20037508.342789244;

/**
 * Convert a Web Mercator (EPSG:3857) coordinate to WGS84 lng/lat. Waymarked Trails returns route
 * geometry in Web Mercator, so we reproject each vertex before it enters our lng/lat pipeline.
 */
export function mercatorToLngLat(x: number, y: number): LngLat {
  const lng = (x / HALF_CIRCUMFERENCE) * 180;
  const latDeg = (y / HALF_CIRCUMFERENCE) * 180;
  const lat = (180 / Math.PI) * (2 * Math.atan(Math.exp((latDeg * Math.PI) / 180)) - Math.PI / 2);
  return { lng, lat };
}
