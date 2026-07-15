import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAppStore } from '../state/store';
import { getPois } from '../services/dataClient';
import { OVERNIGHT_POI_KINDS, type Bbox, type Poi } from '../lib/poiApi';
import { corridorTiles } from '../lib/routeCorridor';

/** Bounds how many upstream queries a long route triggers, and how many run at once (Overpass fair-use). */
const MAX_TILES = 10;
const TILE_CONCURRENCY = 2;
const TILE_SPAN_DEG = 1.5;

function round2(b: Bbox): Bbox {
  const r = (n: number) => Math.round(n * 100) / 100;
  return { south: r(b.south), west: r(b.west), north: r(b.north), east: r(b.east) };
}

/** Run `fn` over items with at most `limit` in flight at once. */
async function mapLimit<T, R>(items: readonly T[], limit: number, fn: (item: T) => Promise<R>) {
  const results: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i] as T);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/**
 * Fetches overnight-capable POIs (huts, campsites, hotels, guesthouses) for the route corridor,
 * TILED into a small set of bounding boxes rather than one giant bbox. A single bbox over a very
 * long route (e.g. the Via Francigena) spans a whole continent and times out on Overpass, returning
 * nothing; tiling keeps each query small and fast while covering the whole path. Tiles are capped
 * and fetched with limited concurrency so this stays cheap even for a 2000 km route.
 */
export function useRouteShelters() {
  const route = useAppStore((s) => s.route);
  const autoOvernight = useAppStore((s) => s.routingOptions.autoOvernight);
  const bufferMeters = useAppStore((s) => s.routingOptions.shelterBufferMeters);
  const setRouteShelters = useAppStore((s) => s.setRouteShelters);

  const padDeg = Math.max(bufferMeters / 111_000, 0.02);
  const tiles = useMemo(
    () =>
      route
        ? corridorTiles(route.points, { maxTiles: MAX_TILES, padDeg, tileSpanDeg: TILE_SPAN_DEG })
        : [],
    [route, padDeg],
  );

  const query = useQuery({
    queryKey: ['route-shelters', tiles.map(round2)],
    queryFn: async ({ signal }) => {
      const perTile = await mapLimit(tiles, TILE_CONCURRENCY, (tile) =>
        getPois(tile, OVERNIGHT_POI_KINDS, signal).catch(() => [] as Poi[]),
      );
      const byId = new Map<string, Poi>();
      for (const list of perTile) for (const p of list) byId.set(p.id, p);
      return [...byId.values()];
    },
    enabled: autoOvernight && tiles.length > 0,
    staleTime: 5 * 60_000,
    retry: false,
  });

  useEffect(() => {
    setRouteShelters(query.data ?? []);
  }, [query.data, setRouteShelters]);
}
