/**
 * PINNED DOMAIN CONSTANTS.
 *
 * The blueprint hid these numbers inside base64 images (Tobler formula, γ table, slope
 * definition, zoom threshold). They are transcribed here as **accepted sensible defaults**,
 * grounded in the canonical literature and typical hiking calibration — good enough to ship
 * and calibrate later against real GPS/known routes. The owner is not verifying against the
 * source image (ADR-009), so these ARE the spec. Change a value only deliberately, together
 * with its test in `constants.test.ts`. See docs/SPEC.md §2.
 */

/**
 * Tobler's Hiking Function: W(S) = baseSpeedKmh * exp(-k * |S + offset|)  [km/h]
 * where S is the tangent of the slope angle (dH / dX_horizontal), NOT dH / 3D-length.
 */
export const TOBLER = {
  /** Max on-foot speed, achieved on the optimal ~ -2.86° downhill grade (km/h). */
  baseSpeedKmh: 6,
  /** Exponential decay constant. */
  k: 3.5,
  /** Slope offset — fastest at S = -0.05 (gentle downhill). */
  offset: 0.05,
} as const; // SOURCE: Tobler (1993), canonical form.

/** Elevation-profile preprocessing applied before differentiating slope (SPEC §2.3). */
export const ELEVATION_SAMPLING = {
  /** Uniform horizontal resample spacing (m) before computing per-segment slope. */
  resampleSpacingMeters: 25,
  /** Smoothing window (odd sample count) for moving-average / Savitzky-Golay. */
  smoothingWindow: 7,
  /** Clamp |slope| to keep exp() stable against DEM vertical noise (~31°). */
  maxAbsSlope: 0.6,
} as const;

/**
 * ORS `extra_info.surface` INTEGER code → γ velocity multiplier ∈ (0, 1].
 *
 * γ MULTIPLIES the Tobler velocity; paved is the 1.0 baseline (Tobler's flat-ground output
 * already assumes firm walkable ground, so γ never exceeds 1). ORS returns surface as
 * [startIdx, endIdx, code] index-range triples — NOT OSM strings — and has NO code for
 * rock/scree/mud, so the "technical scramble" penalty is sourced from `traildifficulty`
 * (SAC scale) below, not from surface. Values are accepted sensible defaults (ADR-009).
 */
export const SURFACE_GAMMA: Readonly<Record<number, number>> = {
  0: 0.8, // Unknown
  1: 1.0, // Paved
  2: 0.9, // Unpaved
  3: 1.0, // Asphalt
  4: 1.0, // Concrete
  5: 0.85, // Cobblestone
  6: 0.85, // Metal
  7: 0.85, // Wood
  8: 0.9, // Compacted Gravel
  9: 0.9, // Fine Gravel
  10: 0.85, // Gravel
  11: 0.8, // Dirt
  12: 0.8, // Ground
  13: 0.4, // Ice / Snow
  14: 1.0, // Paving Stones
  15: 0.6, // Sand
  16: 0.6, // Woodchips
  17: 0.8, // Grass
  18: 0.8, // Grass Paver
};

/** γ fallback when the surface code is missing or out of range. */
export const DEFAULT_SURFACE_GAMMA = 0.8;

/**
 * γ override for technically hard terrain, keyed off ORS `traildifficulty` (SAC scale),
 * applied when SAC grade ≥ T3 — the scramble tier surface codes cannot express.
 */
export const SAC_SCRAMBLE_GAMMA = 0.5;

/** Overpass POI fetches are gated to viewports at/above this zoom (SPEC §3.1). */
export const OVERPASS_MIN_ZOOM = 11;

/**
 * Below this zoom the visible area is too large to load viewport layers (POIs, community hikes)
 * without pulling far too much data — the "Search this area" control shows a "zoom in" hint instead.
 */
export const LAYER_SEARCH_MIN_ZOOM = 9;

/** Multi-day slicing defaults — TIME-based per product decision (DECISIONS ADR-002). */
export const SLICING = {
  /** Target moving hours per day. */
  targetHoursPerDay: 6,
  /** Lower edge of the default desired hours/day band. */
  minHoursPerDay: 4,
  /** Hard cap on a single day's moving time (hours). */
  maxHoursPerDay: 8,
  /** Break/rest inflation multiplier applied to moving time. */
  breakFactor: 1.2,
  /** Max cross-track distance (m) for a shelter to count as an on-route stop. */
  shelterBufferMeters: 500,
} as const;

/** The ORS surface codes we have a γ mapping for. */
export type OrsSurfaceCode = keyof typeof SURFACE_GAMMA;
