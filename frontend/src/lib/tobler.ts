import { TOBLER } from './constants';

/**
 * Tobler's Hiking Function (SPEC §2.3). All speeds in km/h; slope `S` is the tangent
 * dh/dx over HORIZONTAL distance. Fastest at S = -offset (gentle downhill).
 */
export function toblerSpeedKmh(slope: number): number {
  return TOBLER.baseSpeedKmh * Math.exp(-TOBLER.k * Math.abs(slope + TOBLER.offset));
}

/** Effective on-trail speed (km/h): γ velocity multiplier, capped at the flat-ground max. */
export function effectiveSpeedKmh(slope: number, gamma: number): number {
  return Math.min(TOBLER.baseSpeedKmh, gamma * toblerSpeedKmh(slope));
}

/** Seconds to cover a horizontal segment of `distanceMeters` at `slope` with surface `gamma`. */
export function segmentSeconds(distanceMeters: number, slope: number, gamma: number): number {
  const speedKmh = effectiveSpeedKmh(slope, gamma);
  if (speedKmh <= 0 || distanceMeters <= 0) return 0;
  const speedMetersPerSecond = (speedKmh * 1000) / 3600;
  return distanceMeters / speedMetersPerSecond;
}
