import { WmtSearchResponseSchema, WmtDetailsSchema } from '../contracts/waymarked';
import { flattenTrailGeometry } from '../lib/trailGeometry';
import type { LngLat } from '../lib/geo';

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
