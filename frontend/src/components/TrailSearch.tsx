import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAppStore } from '../state/store';
import { searchTrails, fetchTrailPolyline, type TrailHit } from '../services/waymarkedTrails';
import { sampleWaypoints } from '../lib/trailGeometry';
import { useDebouncedValue } from '../hooks/useDebouncedValue';

/** How many stops an imported trail becomes — enough to hold the line, few enough for one ORS snap. */
const IMPORT_STOPS = 28;

/**
 * Search named community/long-distance hiking routes (Waymarked Trails) and load one as the current
 * route. "Make this your hike" imports the trail as a handful of on-route stops, so the normal
 * routing engine re-snaps it — adding elevation + Tobler time and keeping it fully editable.
 */
export function TrailSearch() {
  const [query, setQuery] = useState('');
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const debounced = useDebouncedValue(query, 400);

  const setWaypoints = useAppStore((s) => s.setWaypoints);
  const requestMapFocus = useAppStore((s) => s.requestMapFocus);

  const { data: hits = [], isFetching } = useQuery({
    queryKey: ['trail-search', debounced.trim()],
    queryFn: ({ signal }) => searchTrails(debounced, signal),
    enabled: debounced.trim().length >= 2,
    staleTime: 5 * 60_000,
    retry: false,
  });

  const load = async (hit: TrailHit) => {
    setLoadingId(hit.id);
    setError(null);
    try {
      const line = await fetchTrailPolyline(hit.id);
      const stops = sampleWaypoints(line, IMPORT_STOPS, hit.name);
      if (stops.length < 2) {
        setError('That route has no usable geometry.');
        return;
      }
      setWaypoints(stops);
      requestMapFocus();
      setQuery('');
    } catch {
      setError('Could not load that trail — please try again.');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <section aria-label="Community trail search" className="flex flex-col gap-1">
      <span className="text-[11px] uppercase tracking-wide opacity-60">Find a trail</span>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search named hikes (e.g. TransLagorai, Alta Via 1)"
        aria-label="Search named hikes"
        className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-100"
      />

      {error && (
        <p role="alert" className="text-xs text-hazard-coral">
          {error}
        </p>
      )}

      {isFetching && <p className="text-xs opacity-60">Searching…</p>}

      {hits.length > 0 && (
        <ul className="flex flex-col gap-1">
          {hits.map((hit) => (
            <li key={hit.id}>
              <button
                type="button"
                disabled={loadingId != null}
                onClick={() => void load(hit)}
                className="flex w-full flex-col items-start rounded-md px-2 py-1 text-left text-sm transition-colors hover:bg-trail-green/10 disabled:opacity-50"
              >
                <span className="font-medium">
                  {hit.ref && <span className="opacity-70">{hit.ref} · </span>}
                  {hit.name}
                </span>
                {hit.itinerary && hit.itinerary.length > 0 && (
                  <span className="text-xs opacity-60">{hit.itinerary.join(' → ')}</span>
                )}
                {loadingId === hit.id && <span className="text-xs opacity-60">Loading…</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
