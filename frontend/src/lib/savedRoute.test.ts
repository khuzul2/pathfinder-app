import { describe, it, expect } from 'vitest';
import {
  makeSavedRoute,
  defaultRouteName,
  serializeRoutes,
  deserializeRoutes,
  type SavedRoute,
} from './savedRoute';

describe('defaultRouteName', () => {
  it('joins the first and last named stops', () => {
    expect(
      defaultRouteName([
        { lng: 1, lat: 1, name: 'Munich' },
        { lng: 2, lat: 2 },
        { lng: 3, lat: 3, name: 'Innsbruck' },
      ]),
    ).toBe('Munich → Innsbruck');
  });

  it('uses the single named stop', () => {
    expect(defaultRouteName([{ lng: 1, lat: 1, name: 'Hut' }])).toBe('Hut');
  });

  it('falls back to Untitled route when nothing is named', () => {
    expect(defaultRouteName([{ lng: 1, lat: 1 }])).toBe('Untitled route');
  });
});

describe('makeSavedRoute', () => {
  it('normalizes waypoints (dropping absent names) and caches the analysis', () => {
    const saved = makeSavedRoute({
      id: 'r1',
      name: 'Trip',
      waypoints: [
        { lng: 1, lat: 2, name: 'A' },
        { lng: 3, lat: 4 },
      ],
      now: 1000,
      route: null,
    });
    expect(saved).toEqual({
      id: 'r1',
      name: 'Trip',
      waypoints: [
        { lng: 1, lat: 2, name: 'A' },
        { lng: 3, lat: 4 },
      ],
      updatedAt: 1000,
      route: null,
      alternatives: [],
      selectedRouteIndex: 0,
    });
  });
});

describe('serialize / deserialize', () => {
  const routes: SavedRoute[] = [
    { id: 'r1', name: 'Trip', waypoints: [{ lng: 1, lat: 2 }], updatedAt: 5, route: null },
  ];

  it('round-trips saved routes', () => {
    expect(deserializeRoutes(serializeRoutes(routes))).toEqual(routes);
  });

  it('returns [] for empty, invalid JSON, or the wrong shape', () => {
    expect(deserializeRoutes(null)).toEqual([]);
    expect(deserializeRoutes('')).toEqual([]);
    expect(deserializeRoutes('{not json')).toEqual([]);
    expect(deserializeRoutes(JSON.stringify([{ id: 5, name: 'bad' }]))).toEqual([]);
  });
});
