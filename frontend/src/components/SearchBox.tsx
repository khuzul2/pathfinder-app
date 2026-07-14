import { useState } from 'react';
import { useAppStore } from '../state/store';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { usePlaceSearch } from '../hooks/usePlaceSearch';
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

/** Geocoding search box: type an address or place, pick a suggestion to append it as a stop. */
export function SearchBox() {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const debounced = useDebouncedValue(query, 300);

  const waypoints = useAppStore((s) => s.waypoints);
  const viewportBbox = useAppStore((s) => s.viewportBbox);
  const addWaypoint = useAppStore((s) => s.addWaypoint);

  const { data: results = [], isFetching } = usePlaceSearch(
    debounced,
    proximityOf(waypoints, viewportBbox),
  );

  const pick = (r: GeocodeResult) => {
    addWaypoint({ lng: r.lng, lat: r.lat, name: r.name });
    setQuery('');
    setOpen(false);
  };

  const showList = open && query.trim().length >= 2;

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
          placeholder="Search address or place…"
          aria-label="Search address or place"
          role="combobox"
          aria-expanded={showList}
          aria-controls="place-suggestions"
          className="w-full bg-transparent text-sm text-slate-accent outline-none placeholder:opacity-50 dark:text-neutral-100"
        />
        <span aria-hidden="true" className="opacity-50">
          🔍
        </span>
      </div>

      {showList && (
        <ul
          id="place-suggestions"
          role="listbox"
          className="absolute left-0 right-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-lg border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-800"
        >
          {results.length === 0 && !isFetching && (
            <li className="px-3 py-2 text-sm opacity-60">No matches</li>
          )}
          {results.map((r) => (
            <li key={r.id} role="option" aria-selected="false">
              <button
                type="button"
                // Fire before the input's blur closes the list.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(r)}
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
        </ul>
      )}
    </div>
  );
}
