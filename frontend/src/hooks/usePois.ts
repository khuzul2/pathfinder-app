import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAppStore } from '../state/store';
import { getPois } from '../services/dataClient';
import { POI_KINDS, type Bbox } from '../lib/poiApi';

function roundBbox(b: Bbox): Bbox {
  const r = (n: number) => Math.round(n * 100) / 100;
  return { south: r(b.south), west: r(b.west), north: r(b.north), east: r(b.east) };
}

/**
 * Fetches the VISIBLE POI categories for the COMMITTED search area (`dataArea`), not the live
 * viewport — so it only refetches when the user hits "Search this area" (or on first enable), never
 * on every pan/zoom. Fetching just the toggled-on categories keeps the query light. Results +
 * loading state go to the store.
 */
export function usePois() {
  const dataArea = useAppStore((s) => s.dataArea);
  const poiFilters = useAppStore((s) => s.poiFilters);
  const setPois = useAppStore((s) => s.setPois);
  const setPoiLoading = useAppStore((s) => s.setPoiLoading);

  const kinds = POI_KINDS.filter((k) => poiFilters[k]);

  const query = useQuery({
    queryKey: ['pois', dataArea ? roundBbox(dataArea) : null, kinds],
    queryFn: ({ signal }) => getPois(dataArea as Bbox, kinds, signal),
    enabled: !!dataArea && kinds.length > 0,
    staleTime: 5 * 60_000,
    retry: false,
  });

  useEffect(() => {
    if (query.data) setPois(query.data);
  }, [query.data, setPois]);

  useEffect(() => {
    setPoiLoading(query.isFetching);
  }, [query.isFetching, setPoiLoading]);

  return query;
}
