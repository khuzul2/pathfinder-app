import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAppStore } from '../state/store';
import { requestPois, type Bbox } from '../lib/poiApi';
import { OVERPASS_MIN_ZOOM } from '../lib/constants';

function roundBbox(b: Bbox): Bbox {
  const r = (n: number) => Math.round(n * 100) / 100;
  return { south: r(b.south), west: r(b.west), north: r(b.north), east: r(b.east) };
}

/**
 * Fetches POIs for the current viewport, but only at/above the POI zoom threshold (Overpass
 * fair-use). Keyed on the rounded bbox so small pans reuse the cache. Results go to the store.
 */
export function usePois() {
  const bbox = useAppStore((s) => s.viewportBbox);
  const zoom = useAppStore((s) => s.viewportZoom);
  const setPois = useAppStore((s) => s.setPois);

  const query = useQuery({
    queryKey: ['pois', bbox ? roundBbox(bbox) : null],
    queryFn: ({ signal }) => requestPois(bbox as Bbox, signal),
    enabled: !!bbox && zoom >= OVERPASS_MIN_ZOOM,
    staleTime: 5 * 60_000,
    retry: false,
  });

  useEffect(() => {
    if (query.data) setPois(query.data);
  }, [query.data, setPois]);

  return query;
}
