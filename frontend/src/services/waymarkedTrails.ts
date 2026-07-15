import { WmtSearchResponseSchema, WmtDetailsSchema } from '../contracts/waymarked';
import { flattenTrailGeometry } from '../lib/trailGeometry';
import { lngLatToMercator } from '../lib/webMercator';
import type { LngLat } from '../lib/geo';
import type { Bbox } from '../lib/poiApi';

/**
 * Waymarked Trails "community trails" source. Keyless and CORS-open, so it is called browser-direct
 * (like Overpass/RainViewer) — there is no secret to proxy. Search is fuzzy (trigram) over OSM
 * hiking route relations; geometry comes from the same route detail (reprojected from Web Mercator).
 */
const WMT_BASE = 'https://hiking.waymarkedtrails.org/api/v1';

export interface TrailHit {
  id: number;
  name: string;
  ref?: string;
  /** Ordered via-points from OSM (e.g. ["Vetriolo", "Passo Rolle"]). */
  itinerary?: string[];
}

/** Fuzzy-search named hiking routes by name/ref. Returns [] for a too-short query. */
export async function searchTrails(query: string, signal?: AbortSignal): Promise<TrailHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const res = await fetch(`${WMT_BASE}/list/search?query=${encodeURIComponent(q)}&limit=10`, {
    signal,
  });
  if (!res.ok) throw new Error(`Trail search failed (${res.status})`);
  const parsed = WmtSearchResponseSchema.parse(await res.json());
  return parsed.results.map((r) => ({
    id: r.id,
    name: r.name ?? r.ref ?? `Route ${r.id}`,
    ref: r.ref,
    itinerary: r.itinerary,
  }));
}

/** Fetch a route's full geometry as an ordered WGS84 polyline. */
export async function fetchTrailPolyline(id: number, signal?: AbortSignal): Promise<LngLat[]> {
  const res = await fetch(`${WMT_BASE}/details/relation/${id}?geometry=geojson`, { signal });
  if (!res.ok) throw new Error(`Trail geometry failed (${res.status})`);
  const parsed = WmtDetailsSchema.parse(await res.json());
  return flattenTrailGeometry(parsed.route);
}

/** A named community hike with its drawable geometry (for the interactive map overlay). */
export interface CommunityHike {
  id: number;
  name: string;
  ref?: string;
  points: LngLat[];
}

// Only long/named routes are "hikes" (international/national/regional networks); LOC = local
// numbered paths, which stay in the marked-paths (raster) overlay.
const HIKE_GROUPS = new Set(['INT', 'NAT', 'REG']);

/**
 * List the named hiking routes whose network is regional-or-bigger within a bbox and load each
 * one's geometry, so they can be drawn as an interactive overlay. Capped so a dense viewport can't
 * trigger dozens of geometry fetches. A route whose geometry fails to load is dropped.
 */
export async function fetchCommunityHikes(
  bbox: Bbox,
  cap: number,
  signal?: AbortSignal,
): Promise<CommunityHike[]> {
  const min = lngLatToMercator(bbox.west, bbox.south);
  const max = lngLatToMercator(bbox.east, bbox.north);
  const res = await fetch(
    `${WMT_BASE}/list/by_area?bbox=${min.x},${min.y},${max.x},${max.y}&limit=80`,
    { signal },
  );
  if (!res.ok) throw new Error(`Area listing failed (${res.status})`);
  const parsed = WmtSearchResponseSchema.parse(await res.json());

  const named = parsed.results
    .filter((r) => (r.group ? HIKE_GROUPS.has(r.group) : false))
    .slice(0, cap);

  const hikes = await Promise.all(
    named.map(async (r): Promise<CommunityHike | null> => {
      try {
        const points = await fetchTrailPolyline(r.id, signal);
        if (points.length < 2) return null;
        return { id: r.id, name: r.name ?? r.ref ?? `Route ${r.id}`, ref: r.ref, points };
      } catch {
        return null;
      }
    }),
  );
  return hikes.filter((h): h is CommunityHike => h !== null);
}
