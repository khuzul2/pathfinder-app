import { haversineMeters } from '../lib/geo';

/**
 * Deterministic synthetic upstream responses for the public DEMO deployment (no backend, no
 * keys). Pure + unit-tested. In demo mode an MSW browser worker serves these so the whole UX
 * — snap-to-trail, elevation/Tobler, POIs, day-slicing — works for anyone with just the map.
 */

/** Interpolate a denser polyline between waypoints and drape rolling synthetic elevation. */
export function synthRouteResponse(
  coordinates: ReadonlyArray<readonly [number, number]>,
): Record<string, unknown> {
  const perSegment = 24;
  const dense: Array<[number, number, number]> = [];

  let cumulative = 0;
  for (let s = 0; s < coordinates.length - 1; s++) {
    const a = coordinates[s]!;
    const b = coordinates[s + 1]!;
    const segLen = haversineMeters({ lng: a[0], lat: a[1] }, { lng: b[0], lat: b[1] });
    for (let k = 0; k < perSegment; k++) {
      const t = k / perSegment;
      const lng = a[0] + (b[0] - a[0]) * t;
      const lat = a[1] + (b[1] - a[1]) * t;
      const d = cumulative + segLen * t;
      // Base 800 m + two rolling hills → a believable up-and-down profile.
      const ele = 800 + 220 * Math.sin(d / 900) + 90 * Math.sin(d / 300 + 1);
      dense.push([Number(lng.toFixed(6)), Number(lat.toFixed(6)), Number(ele.toFixed(1))]);
    }
    cumulative += segLen;
  }
  const last = coordinates[coordinates.length - 1]!;
  dense.push([last[0], last[1], 800 + 220 * Math.sin(cumulative / 900)]);

  const n = dense.length;
  // Alternate a couple of surfaces along the way (asphalt → dirt → gravel).
  const surface = {
    values: [
      [0, Math.floor(n / 3), 3],
      [Math.floor(n / 3), Math.floor((2 * n) / 3), 11],
      [Math.floor((2 * n) / 3), n - 1, 10],
    ],
  };

  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: dense },
        properties: {
          summary: { distance: cumulative, duration: cumulative },
          extras: { surface },
        },
      },
    ],
    metadata: { attribution: 'DEMO — synthesized route (openrouteservice format)' },
  };
}

export interface DemoBbox {
  south: number;
  west: number;
  north: number;
  east: number;
}

/** Scatter a deterministic handful of huts/campsites/springs across the current viewport. */
export function synthPoisResponse(bbox: DemoBbox): Record<string, unknown> {
  const lerpLat = (t: number) => bbox.south + (bbox.north - bbox.south) * t;
  const lerpLng = (t: number) => bbox.west + (bbox.east - bbox.west) * t;
  const spec: Array<[number, number, string, string, Record<string, string>]> = [
    [0.3, 0.35, 'alpine_hut', 'Demo Alpine Hut', { tourism: 'alpine_hut' }],
    [0.6, 0.55, 'alpine_hut', 'Bergsteiger Hütte', { tourism: 'alpine_hut' }],
    [0.45, 0.7, 'camp_site', 'Meadow Campsite', { tourism: 'camp_site' }],
    [0.7, 0.25, 'camp_site', 'Lakeside Camp', { tourism: 'camp_site' }],
    [0.5, 0.5, 'spring', 'Fresh Spring', { natural: 'spring' }],
  ];
  const elements = spec.map(([ty, tx, _kind, name, baseTags], i) => ({
    type: 'node',
    id: 900000 + i,
    lat: Number(lerpLat(ty).toFixed(6)),
    lon: Number(lerpLng(tx).toFixed(6)),
    tags: { name, ...baseTags },
  }));
  return { version: 0.6, generator: 'DEMO Overpass', elements };
}
