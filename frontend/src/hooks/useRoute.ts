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

  const query = useQuery({
    queryKey: ['route', waypoints, avoidRoads],
    queryFn: ({ signal }) => getRoutes(waypoints, { profile: orsProfile(avoidRoads) }, signal),
    enabled: waypoints.length >= 2,
    staleTime: 5 * 60_000,
    retry: false,
  });

  useEffect(() => {
    if (query.data) setAlternatives(query.data);
  }, [query.data, setAlternatives]);

  useEffect(() => {
    setRouteError(query.error ? (query.error as Error).message : null);
  }, [query.error, setRouteError]);

  return query;
}
