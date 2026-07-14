import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseGeocodeResults } from './geocode';

const fixture = JSON.parse(
  readFileSync(resolve(process.cwd(), 'test/fixtures/mapbox-geocode.json'), 'utf-8'),
);

describe('parseGeocodeResults', () => {
  it('maps features to flat name/context/point suggestions', () => {
    const results = parseGeocodeResults(fixture);
    expect(results).toHaveLength(3);
    expect(results[0]).toEqual({
      id: 'dXJuOm1ieHBsYzpzZXJzbw',
      name: 'Serso',
      context: 'Autonomous Province of Trento, Italy',
      lng: 11.4512,
      lat: 46.0631,
    });
    expect(results[2]!.name).toBe('Arabellastraße 5');
    expect(results[2]!.context).toContain('München');
  });

  it('falls back to properties.coordinates when geometry is absent', () => {
    const results = parseGeocodeResults({
      features: [
        {
          properties: {
            name: 'Nowhere Hut',
            place_formatted: 'Alps',
            coordinates: { longitude: 11.1, latitude: 47.2 },
          },
        },
      ],
    });
    expect(results).toEqual([
      { id: '11.1,47.2', name: 'Nowhere Hut', context: 'Alps', lng: 11.1, lat: 47.2 },
    ]);
  });

  it('skips features without a usable point or name', () => {
    const results = parseGeocodeResults({
      features: [
        { properties: { name: 'No point' } }, // no coordinates
        { geometry: { coordinates: [9, 45] }, properties: {} }, // no name
        { geometry: { coordinates: [9, 45] }, properties: { name: 'Keep' } },
      ],
    });
    expect(results).toEqual([{ id: '9,45', name: 'Keep', context: '', lng: 9, lat: 45 }]);
  });

  it('returns an empty list for no features', () => {
    expect(parseGeocodeResults({ features: [] })).toEqual([]);
  });

  it('throws on a malformed payload', () => {
    expect(() => parseGeocodeResults({ nope: true })).toThrow();
  });
});
