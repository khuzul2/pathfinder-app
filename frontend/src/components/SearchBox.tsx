import { useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAppStore } from '../state/store';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { usePlaceSearch } from '../hooks/usePlaceSearch';
import { searchTrails, fetchTrailPolyline, type TrailHit } from '../services/waymarkedTrails';
import { sampleWaypoints, TRAIL_IMPORT_STOPS } from '../lib/trailGeometry';
import type { GeocodeResult } from '../lib/geocode';
import type { Waypoint } from '../state/store';
import type { Bbox } from '../lib/poiApi';
import type { LngLat } from '../lib/geo';

/** Bias suggestions toward the last stop, else the current map view. */
function proximityOf(waypoints: readonly Waypoint[], bbox: Bbox | null): LngLat | undefined {
  const last = waypoints[waypoints.length - 1];
  if (last) return { lng: last.lng, lat: last.lat };
  if (bbox) return { lng: (bbox.west + bbox.east) / 2, lat: (bbox.south + bbox.north) / 2 };
  return undefined;
}

/** Non-interactive group header so each result is unambiguously an address vs a trail. */
function GroupHeader({ children }: { children: ReactNode }) {
  return (
    <li
      role="presentation"
      className="px-3 pb-0.5 pt-1.5 text-[10px] font-semibold uppercase tracking-wide opacity-50"
    >
      {children}
    </li>
  );
}

/**
 * One search box for BOTH places/addresses (geocoder → add a stop) and named trails/routes
 * (Waymarked Trails → make this your hike). Results are split into clearly-labelled groups with
 * distinct icons so it's always obvious what kind of thing each result is.
 */
export function SearchBox() {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [loadingTrailId, setLoadingTrailId] = useState<number | null>(null);
  const debounced = useDebouncedValue(query, 300);
  const trimmed = debounced.trim();

  const waypoints = useAppStore((s) => s.waypoints);
  const viewportBbox = useAppStore((s) => s.viewportBbox);
  const addWaypoint = useAppStore((s) => s.addWaypoint);
  const setWaypoints = useAppStore((s) => s.setWaypoints);
  const requestMapFocus = useAppStore((s) => s.requestMapFocus);

  const { data: places = [], isFetching: placesFetching } = usePlaceSearch(
    debounced,
    proximityOf(waypoints, viewportBbox),
  );
  const { data: trails = [], isFetching: trailsFetching } = useQuery({
    queryKey: ['trail-search', trimmed],
    queryFn: ({ signal }) => searchTrails(trimmed, signal),
    enabled: trimmed.length >= 2,
    staleTime: 5 * 60_000,
    retry: false,
  });

  const reset = () => {
    setQuery('');
    setOpen(false);
  };

  const pickPlace = (r: GeocodeResult) => {
    addWaypoint({ lng: r.lng, lat: r.lat, name: r.name });
    requestMapFocus(); // center the first stop, fit-bounds once there are several
    reset();
  };

  const pickTrail = async (hit: TrailHit) => {
    setLoadingTrailId(hit.id);
    try {
      const line = await fetchTrailPolyline(hit.id);
      const stops = sampleWaypoints(line, TRAIL_IMPORT_STOPS, hit.name);
      if (stops.length >= 2) {
        setWaypoints(stops);
        requestMapFocus();
        reset();
      }
    } catch {
      /* leave the list open; the user can retry or pick another */
    } finally {
      setLoadingTrailId(null);
    }
  };

  const showList = open && query.trim().length >= 2;
  const fetching = placesFetching || trailsFetching;
  const noMatches = places.length === 0 && trails.length === 0 && !fetching;

  return (
    <div className="relative">
      <div className="flex items-center gap-2 rounded-lg border border-trail-green/70 bg-white px-3 py-2 focus-within:border-trail-green dark:bg-neutral-900">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search a place, address, or trail…"
          aria-label="Search a place, address, or trail"
          role="combobox"
          aria-expanded={showList}
          aria-controls="search-suggestions"
          className="w-full bg-transparent text-sm text-slate-accent outline-none placeholder:opacity-50 dark:text-neutral-100"
        />
        <span aria-hidden="true" className="opacity-50">
          🔍
        </span>
      </div>

      {showList && (
        <ul
          id="search-suggestions"
          role="listbox"
          className="absolute left-0 right-0 top-full z-20 mt-1 max-h-80 overflow-y-auto rounded-lg border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-800"
        >
          {noMatches && <li className="px-3 py-2 text-sm opacity-60">No matches</li>}

          {places.length > 0 && <GroupHeader>Places &amp; addresses</GroupHeader>}
          {places.map((r) => (
            <li key={`place-${r.id}`} role="option" aria-selected="false">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()} // fire before the input's blur closes the list
                onClick={() => pickPlace(r)}
                className="flex w-full items-baseline gap-1.5 px-3 py-2 text-left text-sm hover:bg-trail-green/10"
              >
                <span aria-hidden="true" className="text-trail-green">
                  📍
                </span>
                <span className="font-semibold text-slate-accent dark:text-neutral-100">
                  {r.name}
                </span>
                <span className="truncate opacity-60">{r.context}</span>
              </button>
            </li>
          ))}

          {trails.length > 0 && <GroupHeader>Trails &amp; routes</GroupHeader>}
          {trails.map((hit) => (
            <li key={`trail-${hit.id}`} role="option" aria-selected="false">
              <button
                type="button"
                disabled={loadingTrailId != null}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => void pickTrail(hit)}
                className="flex w-full items-baseline gap-1.5 px-3 py-2 text-left text-sm hover:bg-trail-green/10 disabled:opacity-50"
              >
                <span aria-hidden="true">🥾</span>
                <span className="font-semibold text-slate-accent dark:text-neutral-100">
                  {hit.ref && <span className="opacity-70">{hit.ref} · </span>}
                  {hit.name}
                </span>
                <span className="truncate opacity-60">
                  {loadingTrailId === hit.id ? 'Loading…' : (hit.itinerary?.join(' → ') ?? 'Trail')}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
