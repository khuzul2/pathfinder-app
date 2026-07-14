import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAppStore } from '../state/store';
import { getRoutes } from '../services/dataClient';
import { orsProfile } from '../lib/routingOptions';

/**
 * Fetches (and analyzes) the snapped route whenever there are ≥2 waypoints. TanStack Query
 * passes an AbortSignal that cancels superseded requests, so a slow earlier route can never
 * overwrite a newer one (the out-of-order hazard the review flagged). Results/errors are
 * mirrored into the store for the rest of the UI.
 */
export function useRoute() {
  const waypoints = useAppStore((s) => s.waypoints);
  const avoidRoads = useAppStore((s) => s.routingOptions.avoidRoads);
  const setAlternatives = useAppStore((s) => s.setAlternatives);
  const setRouteError = useAppStore((s) => s.setRouteError);
  const setRouting = useAppStore((s) => s.setRouting);

  const query = useQuery({
    queryKey: ['route', waypoints, avoidRoads],
    queryFn: ({ signal }) => getRoutes(waypoints, { profile: orsProfile(avoidRoads) }, signal),
    enabled: waypoints.length >= 2,
    staleTime: 5 * 60_000,
    retry: false,
  });

  // Error wins over any stale success: on failure, surface the message AND drop the old line
  // (so a broken route never lingers on the map); on success, clear the error and show the route.
  useEffect(() => {
    if (query.error) {
      setRouteError((query.error as Error).message);
      setAlternatives([]);
    } else if (query.data) {
      setRouteError(null);
      setAlternatives(query.data);
    }
  }, [query.data, query.error, setAlternatives, setRouteError]);

  useEffect(() => {
    setRouting(query.isFetching);
  }, [query.isFetching, setRouting]);

  return query;
}
