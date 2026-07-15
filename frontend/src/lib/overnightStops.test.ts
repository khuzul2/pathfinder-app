import { describe, it, expect } from 'vitest';
import { insertOvernightStops } from './overnightStops';
import type { RoutePoint } from './route';
import type { SlicePlan } from './slicing';
import type { Waypoint } from './geo';
import type { Shelter, DaySegment } from './slicing';

// A straight west→east route of 10 vertices (lng 0..9 at lat 0). Only lng/lat are read.
const routePoints = Array.from({ length: 10 }, (_, i) => ({
  lng: i,
  lat: 0,
})) as unknown as RoutePoint[];

function day(endIndex: number, shelterAtEnd: Shelter | null): DaySegment {
  return { index: 0, startIndex: 0, endIndex, movingSeconds: 0, distanceMeters: 0, shelterAtEnd };
}
function plan(...days: DaySegment[]): SlicePlan {
  return { days, warnings: [] };
}
const hut = (id: string, lng: number, lat: number, name: string): Shelter => ({
  id,
  lng,
  lat,
  kind: 'alpine_hut',
  name,
});

describe('insertOvernightStops', () => {
  const start: Waypoint = { lng: 0, lat: 0, name: 'Start' };
  const end: Waypoint = { lng: 9, lat: 0, name: 'End' };

  it('inserts a single overnight shelter between the bracketing stops', () => {
    const out = insertOvernightStops(
      routePoints,
      [start, end],
      plan(day(4, hut('h', 4, 0.02, 'Hut')), day(9, null)),
    );
    expect(out.inserted).toBe(1);
    expect(out.waypoints.map((w) => w.name)).toEqual(['Start', 'Hut', 'End']);
  });

  it('inserts multiple shelters in route order', () => {
    const out = insertOvernightStops(
      routePoints,
      [start, end],
      plan(day(3, hut('a', 3, 0.02, 'H1')), day(6, hut('b', 6, 0.02, 'H2')), day(9, null)),
    );
    expect(out.inserted).toBe(2);
    expect(out.waypoints.map((w) => w.name)).toEqual(['Start', 'H1', 'H2', 'End']);
  });

  it('places each shelter on the correct leg when there are intermediate stops', () => {
    const mid: Waypoint = { lng: 5, lat: 0, name: 'Mid' };
    const out = insertOvernightStops(
      routePoints,
      [start, mid, end],
      plan(
        day(3, hut('a', 3, 0.02, 'Before Mid')),
        day(7, hut('b', 7, 0.02, 'After Mid')),
        day(9, null),
      ),
    );
    expect(out.waypoints.map((w) => w.name)).toEqual([
      'Start',
      'Before Mid',
      'Mid',
      'After Mid',
      'End',
    ]);
  });

  it('skips wild camps (bivvy) — they already lie on the route', () => {
    const bivvy: Shelter = { id: 'b', lng: 4, lat: 0, kind: 'bivvy', name: 'Wild camp' };
    const out = insertOvernightStops(routePoints, [start, end], plan(day(4, bivvy), day(9, null)));
    expect(out.inserted).toBe(0);
    expect(out.waypoints).toHaveLength(2);
  });

  it('is idempotent: a shelter already covered by a nearby stop is not re-added', () => {
    const atHut: Waypoint = { lng: 4, lat: 0.02, name: 'Hut' };
    const out = insertOvernightStops(
      routePoints,
      [start, atHut, end],
      plan(day(4, hut('h', 4, 0.0201, 'Hut')), day(9, null)),
    );
    expect(out.inserted).toBe(0);
    expect(out.waypoints).toHaveLength(3);
  });

  it('returns the stops unchanged when there are fewer than two', () => {
    const out = insertOvernightStops(routePoints, [start], plan(day(4, hut('h', 4, 0.02, 'Hut'))));
    expect(out.inserted).toBe(0);
    expect(out.waypoints).toEqual([start]);
  });
});
