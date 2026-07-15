import { describe, it, expect } from 'vitest';
import { insertWaterStops, type SpringLike } from './waterStops';
import type { RoutePoint } from './route';
import type { SlicePlan } from './slicing';
import type { DaySegment } from './slicing';
import type { Waypoint } from './geo';

// West→east route of 10 vertices (lng 0..9 at lat 0). Only lng/lat are read.
const routePoints = Array.from({ length: 10 }, (_, i) => ({
  lng: i,
  lat: 0,
})) as unknown as RoutePoint[];

function day(startIndex: number, endIndex: number): DaySegment {
  return {
    index: 0,
    startIndex,
    endIndex,
    movingSeconds: 0,
    distanceMeters: 0,
    shelterAtEnd: null,
  };
}
function plan(...days: DaySegment[]): SlicePlan {
  return { days, warnings: [] };
}

const start: Waypoint = { lng: 0, lat: 0, name: 'Start' };
const end: Waypoint = { lng: 9, lat: 0, name: 'End' };

describe('insertWaterStops', () => {
  it('inserts the nearest reachable spring for a dry day', () => {
    const spring: SpringLike = { id: 's', lng: 5, lat: 0.02, name: 'Fresh Spring' }; // ~2.2 km off-route
    const out = insertWaterStops(routePoints, [start, end], plan(day(0, 9)), [spring]);
    expect(out.inserted).toBe(1);
    expect(out.waypoints.map((w) => w.name)).toEqual(['Start', 'Fresh Spring', 'End']);
  });

  it('skips a day that already passes close to water', () => {
    const spring: SpringLike = { id: 's', lng: 5, lat: 0.001, name: 'On-route Spring' }; // ~110 m
    const out = insertWaterStops(routePoints, [start, end], plan(day(0, 9)), [spring]);
    expect(out.inserted).toBe(0);
    expect(out.waypoints).toHaveLength(2);
  });

  it('ignores springs beyond the max detour', () => {
    const far: SpringLike = { id: 'f', lng: 5, lat: 0.1, name: 'Far Spring' }; // ~11 km off-route
    const out = insertWaterStops(routePoints, [start, end], plan(day(0, 9)), [far]);
    expect(out.inserted).toBe(0);
  });

  it('adds water for each dry day and reuses no spring twice', () => {
    const springs: SpringLike[] = [
      { id: 'a', lng: 2, lat: 0.02, name: 'W1' },
      { id: 'b', lng: 7, lat: 0.02, name: 'W2' },
    ];
    const out = insertWaterStops(routePoints, [start, end], plan(day(0, 4), day(4, 9)), springs);
    expect(out.inserted).toBe(2);
    expect(out.waypoints.map((w) => w.name)).toEqual(['Start', 'W1', 'W2', 'End']);
  });

  it('is a no-op without springs or stops', () => {
    expect(insertWaterStops(routePoints, [start, end], plan(day(0, 9)), []).inserted).toBe(0);
    expect(
      insertWaterStops(routePoints, [start], plan(day(0, 9)), [{ id: 's', lng: 5, lat: 0.02 }])
        .inserted,
    ).toBe(0);
  });
});
