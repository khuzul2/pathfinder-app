import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAppStore } from '../state/store';
import { getRadar } from '../services/dataClient';
import { parseRadarFrames } from '../lib/radar';

/** Fetches the RainViewer frame index when the radar overlay is enabled and stores it. */
export function useRadar() {
  const enabled = useAppStore((s) => s.radarEnabled);
  const setRadar = useAppStore((s) => s.setRadar);

  const query = useQuery({
    queryKey: ['radar'],
    queryFn: ({ signal }) => getRadar(signal),
    enabled,
    staleTime: 10 * 60_000,
    retry: false,
  });

  useEffect(() => {
    if (query.data) setRadar(query.data.host, parseRadarFrames(query.data));
  }, [query.data, setRadar]);
}
