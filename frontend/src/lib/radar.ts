import type { RainViewerMaps } from '../contracts/rainviewer';

/**
 * RainViewer radar helpers (pure). Tile URLs are built from the `host` + frame `path`
 * returned by weather-maps.json — both are versioned/dynamic and must NOT be hardcoded.
 * Post-2026 free tier: max zoom 7, color scheme id 2 ("Universal Blue") only. See SPEC §3.3.
 */

export interface RadarFrame {
  time: number;
  path: string;
}

/** RainViewer free-tier caps rendering at zoom 7 (the layer overzooms above it). */
export const RADAR_MAX_ZOOM = 7;
/** The only free color scheme after 2026-01-01. */
export const RADAR_COLOR_SCHEME = 2;
export const RADAR_TILE_SIZE = 256;

export function parseRadarFrames(maps: RainViewerMaps): RadarFrame[] {
  const past = maps.radar.past ?? [];
  const nowcast = maps.radar.nowcast ?? [];
  return [...past, ...nowcast];
}

/** The most recent observed frame (null if none). */
export function latestPastFrame(maps: RainViewerMaps): RadarFrame | null {
  const past = maps.radar.past ?? [];
  const last = past[past.length - 1];
  return last ?? null;
}

export interface RadarTileOptions {
  size?: number;
  color?: number;
  /** smoothing (0/1) */
  smooth?: number;
  /** snow-as-separate-color (0/1) */
  snow?: number;
}

/**
 * Build a Mapbox raster tile-URL TEMPLATE for a frame, leaving `{z}/{x}/{y}` for Mapbox to
 * substitute: `${host}${path}/${size}/{z}/{x}/{y}/${color}/${smooth}_${snow}.png`.
 */
export function buildRadarTileUrl(
  host: string,
  path: string,
  options: RadarTileOptions = {},
): string {
  const size = options.size ?? RADAR_TILE_SIZE;
  const color = options.color ?? RADAR_COLOR_SCHEME;
  const smooth = options.smooth ?? 1;
  const snow = options.snow ?? 1;
  return `${host}${path}/${size}/{z}/{x}/{y}/${color}/${smooth}_${snow}.png`;
}
