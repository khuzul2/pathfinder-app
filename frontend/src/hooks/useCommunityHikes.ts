import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAppStore } from '../state/store';
import { fetchCommunityHikes } from '../services/waymarkedTrails';
import type { Bbox } from '../lib/poiApi';
import { OVERPASS_MIN_ZOOM } from '../lib/constants';

/** Ceiling on hikes drawn at once, so a dense viewport can't fire dozens of geometry fetches. */
const MAX_HIKES = 12;

function roundBbox(b: Bbox): Bbox {
  const r = (n: number) => Math.round(n * 100) / 100;
  return { south: r(b.south), west: r(b.west), north: r(b.north), east: r(b.east) };
}

/**
 * When the "community hikes" overlay is on, fetch the named regional+ hiking routes in view (with
 * geometry) so the map can draw them as an interactive, clickable layer. Zoom-gated + capped like
 * the POI fetch; results go to the store and clear when the overlay is off.
 */
export function useCommunityHikes() {
  const enabled = useAppStore((s) => s.communityHikesEnabled);
  const bbox = useAppStore((s) => s.viewportBbox);
  const zoom = useAppStore((s) => s.viewportZoom);
  const setCommunityHikes = useAppStore((s) => s.setCommunityHikes);

  const query = useQuery({
    queryKey: ['community-hikes', bbox ? roundBbox(bbox) : null],
    queryFn: ({ signal }) => fetchCommunityHikes(bbox as Bbox, MAX_HIKES, signal),
    enabled: enabled && !!bbox && zoom >= OVERPASS_MIN_ZOOM,
    staleTime: 5 * 60_000,
    retry: false,
  });

  useEffect(() => {
    if (!enabled) {
      setCommunityHikes([]);
      return;
    }
    if (query.data) setCommunityHikes(query.data);
  }, [enabled, query.data, setCommunityHikes]);
}
