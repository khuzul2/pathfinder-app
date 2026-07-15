import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAppStore } from '../state/store';
import { getPois } from '../services/dataClient';
import { OVERNIGHT_POI_KINDS, type Bbox } from '../lib/poiApi';
import type { RoutePoint } from '../lib/route';

/** Bounding box of the route, padded ~2 km so shelters just off the corridor are included. */
function routeBbox(points: readonly RoutePoint[]): Bbox | null {
  if (points.length < 2) return null;
  let south = 90;
  let north = -90;
  let west = 180;
  let east = -180;
  for (const p of points) {
    south = Math.min(south, p.lat);
    north = Math.max(north, p.lat);
    west = Math.min(west, p.lng);
    east = Math.max(east, p.lng);
  }
  const pad = 0.02;
  return { south: south - pad, west: west - pad, north: north + pad, east: east + pad };
}

function round2(b: Bbox): Bbox {
  const r = (n: number) => Math.round(n * 100) / 100;
  return { south: r(b.south), west: r(b.west), north: r(b.north), east: r(b.east) };
}

/**
 * Fetches overnight-capable POIs (huts, campsites, hotels, guesthouses) for the WHOLE route
 * corridor, independent of the map viewport/zoom. The map's `usePois` only covers what's on
 * screen at a POI zoom, so a long route shown zoomed-out would otherwise have no shelters to slice
 * on — this is what makes "auto overnight stays" find shelters along a multi-day traverse.
 */
export function useRouteShelters() {
  const route = useAppStore((s) => s.route);
  const autoOvernight = useAppStore((s) => s.routingOptions.autoOvernight);
  const setRouteShelters = useAppStore((s) => s.setRouteShelters);

  const bbox = useMemo(() => (route ? routeBbox(route.points) : null), [route]);

  const query = useQuery({
    queryKey: ['route-shelters', bbox ? round2(bbox) : null],
    queryFn: ({ signal }) => getPois(bbox as Bbox, OVERNIGHT_POI_KINDS, signal),
    enabled: autoOvernight && !!bbox,
    staleTime: 5 * 60_000,
    retry: false,
  });

  useEffect(() => {
    setRouteShelters(query.data ?? []);
  }, [query.data, setRouteShelters]);
}
