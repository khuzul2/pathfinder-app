import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAppStore } from '../state/store';
import { getPois } from '../services/dataClient';
import { OVERNIGHT_POI_KINDS, type Bbox, type Poi, type PoiKind } from '../lib/poiApi';
import { corridorTiles } from '../lib/routeCorridor';

/** Overnight kinds + water so both the day planner and the "add water stops" action are fed. */
const CORRIDOR_KINDS: readonly PoiKind[] = [...OVERNIGHT_POI_KINDS, 'spring'];

/** Query budget: bounded tiles, each ~1° so Overpass answers fast, a couple in flight (fair-use). */
const MAX_TILES = 16;
const MAX_TILE_SPAN_DEG = 1.0;
const TILE_CONCURRENCY = 2;

function round2(b: Bbox): Bbox {
  const r = (n: number) => Math.round(n * 100) / 100;
  return { south: r(b.south), west: r(b.west), north: r(b.north), east: r(b.east) };
}

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
 * Fetches overnight-capable POIs (huts, campsites, hotels, guesthouses) + water sources along the
 * route corridor, TILED into bounding boxes each bounded to ~1°. A single bbox over a long diagonal
 * route (e.g. the Via Francigena) is continental and times out, leaving whole legs shelterless;
 * size-bounded tiles keep every Overpass query small + fast while covering the whole path. Tiles are
 * capped and fetched with limited concurrency; a failed tile is dropped. Results are partitioned
 * into shelters + springs, and the fetch state drives the overnight feedback indicator.
 */
export function useRouteShelters() {
  const route = useAppStore((s) => s.route);
  const overnightNonce = useAppStore((s) => s.overnightNonce);
  const bufferMeters = useAppStore((s) => s.routingOptions.shelterBufferMeters);
  const setRouteShelters = useAppStore((s) => s.setRouteShelters);
  const setRouteSprings = useAppStore((s) => s.setRouteSprings);
  const setSheltersLoading = useAppStore((s) => s.setSheltersLoading);

  const padDeg = Math.max(bufferMeters / 111_000, 0.02);
  const tiles = useMemo(
    () =>
      route
        ? corridorTiles(route.points, {
            maxTiles: MAX_TILES,
            padDeg,
            maxTileSpanDeg: MAX_TILE_SPAN_DEG,
          })
        : [],
    [route, padDeg],
  );

  const query = useQuery({
    // Nonce in the key so re-pressing "Plan overnight stays" forces a fresh fetch (e.g. to retry a
    // rate-limited tile) even when the route + tiles are unchanged.
    queryKey: ['route-shelters', overnightNonce, tiles.map(round2)],
    queryFn: async ({ signal }) => {
      const perTile = await mapLimit(tiles, TILE_CONCURRENCY, (tile) =>
        getPois(tile, CORRIDOR_KINDS, signal).catch(() => [] as Poi[]),
      );
      const byId = new Map<string, Poi>();
      for (const list of perTile) for (const p of list) byId.set(p.id, p);
      return [...byId.values()];
    },
    enabled: overnightNonce > 0 && tiles.length > 0,
    staleTime: 5 * 60_000,
    retry: false,
  });

  useEffect(() => {
    const pois = query.data ?? [];
    setRouteShelters(pois.filter((p) => p.kind !== 'spring'));
    setRouteSprings(pois.filter((p) => p.kind === 'spring'));
  }, [query.data, setRouteShelters, setRouteSprings]);

  useEffect(() => {
    setSheltersLoading(query.isFetching);
  }, [query.isFetching, setSheltersLoading]);
}
