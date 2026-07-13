import { OverpassResponseSchema } from '../contracts/overpass';
import type { Shelter } from './slicing';

export type PoiKind = 'alpine_hut' | 'camp_site' | 'spring';

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
  if (tags.tourism === 'alpine_hut') return 'alpine_hut';
  if (tags.tourism === 'camp_site') return 'camp_site';
  if (tags.natural === 'spring') return 'spring';
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

/** Only overnight-capable POIs (huts + campsites) are valid nightover stops. */
export function sheltersFrom(pois: readonly Poi[]): Shelter[] {
  return pois
    .filter((p) => p.kind === 'alpine_hut' || p.kind === 'camp_site')
    .map((p) => ({ id: p.id, lng: p.lng, lat: p.lat, name: p.name, kind: p.kind }));
}

export async function requestPois(bbox: Bbox, signal?: AbortSignal): Promise<Poi[]> {
  const qs = new URLSearchParams({
    south: String(bbox.south),
    west: String(bbox.west),
    north: String(bbox.north),
    east: String(bbox.east),
  });
  const res = await fetch(`/api/pois?${qs.toString()}`, { signal });
  if (!res.ok) throw new Error(`POI request failed (${res.status})`);
  return parseOverpassPois(await res.json());
}
