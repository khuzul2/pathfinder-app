import { OverpassResponseSchema } from '../contracts/overpass';
import type { Shelter } from './slicing';

export type PoiKind =
  | 'alpine_hut'
  | 'camp_site'
  | 'hotel'
  | 'guesthouse'
  | 'spring'
  | 'peak'
  | 'viewpoint'
  | 'waterfall';

/** Display metadata per POI category (marker icon/color, legend + filter labels). */
export const POI_META: Readonly<Record<PoiKind, { label: string; icon: string; color: string }>> = {
  alpine_hut: { label: 'Mountain hut', icon: '🏠', color: '#0F9D58' },
  camp_site: { label: 'Campsite', icon: '⛺', color: '#4285F4' },
  hotel: { label: 'Hotel', icon: '🏨', color: '#7E57C2' },
  guesthouse: { label: 'Guesthouse / B&B', icon: '🛏️', color: '#AB47BC' },
  spring: { label: 'Water source', icon: '💧', color: '#00A3BF' },
  peak: { label: 'Peak', icon: '⛰️', color: '#8D6E63' },
  viewpoint: { label: 'Viewpoint', icon: '🔭', color: '#F9AB00' },
  waterfall: { label: 'Waterfall', icon: '💦', color: '#26A69A' },
};

export const POI_KINDS: readonly PoiKind[] = [
  'alpine_hut',
  'camp_site',
  'hotel',
  'guesthouse',
  'spring',
  'peak',
  'viewpoint',
  'waterfall',
];

/** Categories that can serve as an overnight stop for the day-slicer. */
const OVERNIGHT_KINDS: ReadonlySet<PoiKind> = new Set<PoiKind>([
  'alpine_hut',
  'camp_site',
  'hotel',
  'guesthouse',
]);

export interface Poi {
  id: string;
  lng: number;
  lat: number;
  name?: string;
  kind: PoiKind;
}

export interface Bbox {
  south: number;
  west: number;
  north: number;
  east: number;
}

function kindFor(tags: Record<string, string>): PoiKind | null {
  switch (tags.tourism) {
    case 'alpine_hut':
      return 'alpine_hut';
    case 'camp_site':
      return 'camp_site';
    case 'hotel':
      return 'hotel';
    case 'guest_house':
      return 'guesthouse';
    case 'viewpoint':
      return 'viewpoint';
  }
  if (tags.natural === 'spring') return 'spring';
  if (tags.natural === 'peak') return 'peak';
  if (tags.natural === 'waterfall' || tags.waterway === 'waterfall') return 'waterfall';
  return null;
}

/** Map an Overpass response to typed POIs (huts, campsites, springs). */
export function parseOverpassPois(data: unknown): Poi[] {
  const parsed = OverpassResponseSchema.parse(data);
  const pois: Poi[] = [];
  for (const el of parsed.elements) {
    if (el.lat == null || el.lon == null) continue;
    const kind = kindFor(el.tags ?? {});
    if (!kind) continue;
    pois.push({ id: `${el.type}/${el.id}`, lng: el.lon, lat: el.lat, name: el.tags?.name, kind });
  }
  return pois;
}

/** Only overnight-capable POIs (huts, campsites, hotels, guesthouses) are valid nightover stops. */
export function sheltersFrom(pois: readonly Poi[]): Shelter[] {
  return pois
    .filter((p) => OVERNIGHT_KINDS.has(p.kind))
    .map((p) => ({ id: p.id, lng: p.lng, lat: p.lat, name: p.name, kind: p.kind }));
}

/** Overpass node selectors per category (waterfall spans two tag schemes). */
const OVERPASS_SELECTORS: Readonly<Record<PoiKind, readonly string[]>> = {
  alpine_hut: ['node["tourism"="alpine_hut"]'],
  camp_site: ['node["tourism"="camp_site"]'],
  hotel: ['node["tourism"="hotel"]'],
  guesthouse: ['node["tourism"="guest_house"]'],
  spring: ['node["natural"="spring"]'],
  peak: ['node["natural"="peak"]'],
  viewpoint: ['node["tourism"="viewpoint"]'],
  waterfall: ['node["natural"="waterfall"]', 'node["waterway"="waterfall"]'],
};

/** POI categories that can serve as overnight stops (used for route-corridor shelter fetches). */
export const OVERNIGHT_POI_KINDS: readonly PoiKind[] = [
  'alpine_hut',
  'camp_site',
  'hotel',
  'guesthouse',
];

/**
 * Build an Overpass QL query for the given bbox suffix (e.g. `"(s,w,n,e)"`) and POI kinds. Only the
 * requested categories are queried — fetching peaks (dense in the Alps) when they're hidden would
 * bloat the response and slow the map, so callers pass just the categories they need.
 */
export function buildOverpassQuery(bboxSuffix: string, kinds: readonly PoiKind[]): string {
  const body = kinds
    .flatMap((k) => OVERPASS_SELECTORS[k])
    .map((sel) => `${sel}${bboxSuffix};`)
    .join('');
  return `[out:json][timeout:25];(${body});out body;`;
}

export async function requestPois(
  bbox: Bbox,
  kinds: readonly PoiKind[] = POI_KINDS,
  signal?: AbortSignal,
): Promise<Poi[]> {
  const qs = new URLSearchParams({
    south: String(bbox.south),
    west: String(bbox.west),
    north: String(bbox.north),
    east: String(bbox.east),
    kinds: kinds.join(','),
  });
  const res = await fetch(`/api/pois?${qs.toString()}`, { signal });
  if (!res.ok) throw new Error(`POI request failed (${res.status})`);
  return parseOverpassPois(await res.json());
}
