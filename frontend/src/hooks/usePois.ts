import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAppStore } from '../state/store';
import { getPois } from '../services/dataClient';
import { POI_KINDS, type Bbox } from '../lib/poiApi';
import { OVERPASS_MIN_ZOOM } from '../lib/constants';

function roundBbox(b: Bbox): Bbox {
  const r = (n: number) => Math.round(n * 100) / 100;
  return { south: r(b.south), west: r(b.west), north: r(b.north), east: r(b.east) };
}

/**
 * Fetches the VISIBLE POI categories for the current viewport, only at/above the POI zoom
 * threshold (Overpass fair-use). Fetching just the toggled-on categories keeps the query light —
 * peaks especially are dense in the Alps, so querying them only when shown avoids a slow map.
 * Keyed on the rounded bbox + kinds so small pans reuse the cache. Results go to the store.
 */
export function usePois() {
  const bbox = useAppStore((s) => s.viewportBbox);
  const zoom = useAppStore((s) => s.viewportZoom);
  const poiFilters = useAppStore((s) => s.poiFilters);
  const setPois = useAppStore((s) => s.setPois);

  const kinds = POI_KINDS.filter((k) => poiFilters[k]);

  const query = useQuery({
    queryKey: ['pois', bbox ? roundBbox(bbox) : null, kinds],
    queryFn: ({ signal }) => getPois(bbox as Bbox, kinds, signal),
    enabled: !!bbox && zoom >= OVERPASS_MIN_ZOOM && kinds.length > 0,
    staleTime: 5 * 60_000,
    retry: false,
  });

  useEffect(() => {
    if (query.data) setPois(query.data);
  }, [query.data, setPois]);

  return query;
}
