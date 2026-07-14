// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { localRouteStorage } from './routeStorage';
import type { SavedRoute } from '../lib/savedRoute';

const routes: SavedRoute[] = [
  { id: 'r1', name: 'Trip', waypoints: [{ lng: 1, lat: 2, name: 'A' }], updatedAt: 5, route: null },
];

describe('localRouteStorage', () => {
  beforeEach(() => localStorage.clear());

  it('returns [] when nothing is stored', () => {
    expect(localRouteStorage.load()).toEqual([]);
  });

  it('round-trips routes through localStorage', () => {
    localRouteStorage.save(routes);
    expect(localRouteStorage.load()).toEqual(routes);
  });

  it('recovers from a corrupt payload', () => {
    localStorage.setItem('pathfinder.routes.v1', '{corrupt');
    expect(localRouteStorage.load()).toEqual([]);
  });
});
