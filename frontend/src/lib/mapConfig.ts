/**
 * Mapbox map configuration constants. The Outdoors style carries the topo/contour detail
 * that is the whole point; dark mode keeps this style (dark-v11 discards contours) and
 * darkens the surrounding UI chrome instead. See SPEC §5.
 */
export const MAP_STYLE = 'mapbox://styles/mapbox/outdoors-v12';

/** Default view: the Karwendel Alps (alpine hut country). */
export const DEFAULT_CENTER: readonly [number, number] = [11.4, 47.26];
export const DEFAULT_ZOOM = 11;

/**
 * Always-visible data attribution (a shipped, tested requirement — SPEC §5). Order:
 * OSM (ODbL) · Mapbox (ToS) · openrouteservice (CC-BY) · RainViewer.
 */
export const ATTRIBUTIONS: readonly string[] = [
  '© OpenStreetMap contributors',
  '© Mapbox',
  'Routing © openrouteservice',
  'Radar © RainViewer',
];
