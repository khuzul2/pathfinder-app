import { parseGeocodeResults, type GeocodeResult } from '../lib/geocode';
import type { LngLat } from '../lib/geo';

const ENDPOINT = 'https://api.mapbox.com/search/geocode/v6/forward';

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
    types: 'address,street,place,locality,neighborhood,poi,region',
  });
  if (opts.proximity) params.set('proximity', `${opts.proximity.lng},${opts.proximity.lat}`);

  const res = await fetch(`${opts.endpoint ?? ENDPOINT}?${params.toString()}`, {
    signal: opts.signal,
  });
  if (!res.ok) throw new Error(`Geocoding failed (${res.status})`);
  return parseGeocodeResults(await res.json());
}
