import { MapboxGeocodeSchema } from '../contracts/mapbox';

/** A place suggestion from the geocoder: a bold `name` + a `context` line, at a point. */
export interface GeocodeResult {
  id: string;
  name: string;
  context: string;
  lng: number;
  lat: number;
}

/**
 * Parse a Mapbox Geocoding v6 response into flat, typed suggestions. Coordinates come from the
 * GeoJSON geometry (falling back to `properties.coordinates`); a feature with neither a usable
 * point nor a name is skipped rather than surfaced half-formed.
 */
export function parseGeocodeResults(data: unknown): GeocodeResult[] {
  const parsed = MapboxGeocodeSchema.parse(data);
  const results: GeocodeResult[] = [];
  for (const feature of parsed.features) {
    const props = feature.properties;
    const geo = feature.geometry?.coordinates;
    const lng = typeof geo?.[0] === 'number' ? geo[0] : props?.coordinates?.longitude;
    const lat = typeof geo?.[1] === 'number' ? geo[1] : props?.coordinates?.latitude;
    if (typeof lng !== 'number' || typeof lat !== 'number') continue;

    const name = props?.name ?? props?.name_preferred;
    if (!name) continue;

    const context = props?.place_formatted ?? props?.full_address ?? '';
    const id = props?.mapbox_id ?? (feature.id != null ? String(feature.id) : `${lng},${lat}`);
    results.push({ id, name, context, lng, lat });
  }
  return results;
}
