import { parseGeocodeResults, type GeocodeResult } from '../lib/geocode';
import type { LngLat } from '../lib/geo';

const ENDPOINT = 'https://api.mapbox.com/search/geocode/v6/forward';
const REVERSE_ENDPOINT = 'https://api.mapbox.com/search/geocode/v6/reverse';

export interface SearchOptions {
  signal?: AbortSignal;
  /** Bias results toward this point (usually the last stop or the map centre). */
  proximity?: LngLat;
  limit?: number;
  /** Overridable for tests; defaults to the client Mapbox token. */
  token?: string;
  endpoint?: string;
}

/**
 * Forward-geocode a free-text query with Mapbox (addresses + POIs), biased toward `proximity`.
 * Returns `[]` for a too-short query or a missing token (the demo can run without geocoding).
 * The Mapbox token is the one credential allowed client-side (see CLAUDE.md invariants).
 */
export async function searchPlaces(
  query: string,
  opts: SearchOptions = {},
): Promise<GeocodeResult[]> {
  const q = query.trim();
  const token = opts.token ?? import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
  if (q.length < 2 || !token) return [];

  const params = new URLSearchParams({
    q,
    access_token: token,
    autocomplete: 'true',
    limit: String(opts.limit ?? 6),
    // Valid Geocoding v6 feature types only — "poi" is NOT one (it 422s the whole request),
    // which is why village/place searches returned nothing.
    types: 'region,district,place,locality,neighborhood,street,address',
  });
  if (opts.proximity) params.set('proximity', `${opts.proximity.lng},${opts.proximity.lat}`);

  const res = await fetch(`${opts.endpoint ?? ENDPOINT}?${params.toString()}`, {
    signal: opts.signal,
  });
  if (!res.ok) throw new Error(`Geocoding failed (${res.status})`);
  return parseGeocodeResults(await res.json());
}

/**
 * Reverse-geocode a point to a place/address name (for labelling a map-clicked stop). Returns
 * `null` on any failure or missing token — the caller falls back to showing coordinates.
 */
export async function reverseGeocode(
  lng: number,
  lat: number,
  opts: { signal?: AbortSignal; token?: string; endpoint?: string } = {},
): Promise<string | null> {
  const token = opts.token ?? import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
  if (!token) return null;
  const params = new URLSearchParams({
    longitude: String(lng),
    latitude: String(lat),
    access_token: token,
    limit: '1',
  });
  try {
    const res = await fetch(`${opts.endpoint ?? REVERSE_ENDPOINT}?${params.toString()}`, {
      signal: opts.signal,
    });
    if (!res.ok) return null;
    return parseGeocodeResults(await res.json())[0]?.name ?? null;
  } catch {
    return null;
  }
}
