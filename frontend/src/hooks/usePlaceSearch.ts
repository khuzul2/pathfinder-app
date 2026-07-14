import { useQuery } from '@tanstack/react-query';
import { searchPlaces } from '../services/geocodeClient';
import type { LngLat } from '../lib/geo';

/**
 * Autocomplete suggestions for a (already debounced) query, biased toward `proximity`. Disabled
 * for a too-short query; the AbortSignal cancels superseded lookups so results never race.
 */
export function usePlaceSearch(query: string, proximity?: LngLat) {
  const q = query.trim();
  return useQuery({
    queryKey: [
      'geocode',
      q,
      proximity ? [Math.round(proximity.lng * 100), Math.round(proximity.lat * 100)] : null,
    ],
    queryFn: ({ signal }) => searchPlaces(q, { signal, proximity }),
    enabled: q.length >= 2,
    staleTime: 60_000,
    retry: false,
  });
}
