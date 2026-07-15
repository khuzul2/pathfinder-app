import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAppStore } from '../state/store';
import { fetchCommunityHikes } from '../services/waymarkedTrails';
import type { Bbox } from '../lib/poiApi';

/** Ceiling on hikes drawn at once, so a large area can't fire dozens of geometry fetches. */
const MAX_HIKES = 12;

function roundBbox(b: Bbox): Bbox {
  const r = (n: number) => Math.round(n * 100) / 100;
  return { south: r(b.south), west: r(b.west), north: r(b.north), east: r(b.east) };
}

/**
 * When the "community hikes" overlay is on, fetch the named regional+ hiking routes in the COMMITTED
 * search area (`dataArea`, not the live viewport) so it only reloads on "Search this area" — never
 * on every pan/zoom. Capped; results + loading go to the store and clear when the overlay is off.
 */
export function useCommunityHikes() {
  const enabled = useAppStore((s) => s.communityHikesEnabled);
  const dataArea = useAppStore((s) => s.dataArea);
  const setCommunityHikes = useAppStore((s) => s.setCommunityHikes);
  const setHikeLoading = useAppStore((s) => s.setHikeLoading);

  const query = useQuery({
    queryKey: ['community-hikes', dataArea ? roundBbox(dataArea) : null],
    queryFn: ({ signal }) => fetchCommunityHikes(dataArea as Bbox, MAX_HIKES, signal),
    enabled: enabled && !!dataArea,
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

  useEffect(() => {
    setHikeLoading(enabled && query.isFetching);
  }, [enabled, query.isFetching, setHikeLoading]);
}
