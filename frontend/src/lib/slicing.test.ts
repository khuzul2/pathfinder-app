import { describe, it, expect } from 'vitest';
import { matchSheltersToRoute, planDays, type Shelter } from './slicing';
import type { RoutePoint } from './route';

// Build a synthetic route along a north line, 100 m between vertices, with the given
// cumulative hours at each vertex.
function makeRoute(cumulativeHours: readonly number[]): RoutePoint[] {
  return cumulativeHours.map((h, i) => ({
    lng: 0,
    lat: i * 0.000899, // ~100 m north per step
    ele: 0,
    distanceMeters: i * 100,
    timeSeconds: h * 3600,
  }));
}

const shelterAt = (i: number, id: string): Shelter => ({
  id,
  lng: 0,
  lat: i * 0.000899,
  kind: 'alpine_hut',
});

const H = 3600;

describe('matchSheltersToRoute', () => {
  const route = makeRoute([0, 1, 2, 3, 4, 5]);

  it('matches an on-route interior shelter to its vertex', () => {
    const c = matchSheltersToRoute(route, [shelterAt(3, 's3')]);
    expect(c).toHaveLength(1);
    expect(c[0]!.pointIndex).toBe(3);
    expect(c[0]!.offsetMeters).toBeLessThan(1);
  });

  it('includes a shelter within the 500 m buffer and rejects one beyond it', () => {
    const near: Shelter = { id: 'near', lng: 0.00269, lat: 3 * 0.000899, kind: 'camp_site' }; // ~300 m east
    const far: Shelter = { id: 'far', lng: 0.00808, lat: 3 * 0.000899, kind: 'camp_site' }; // ~900 m east
    expect(matchSheltersToRoute(route, [near])).toHaveLength(1);
    expect(matchSheltersToRoute(route, [far])).toHaveLength(0);
  });

  it('never matches the start or end vertex, and dedupes to the closest', () => {
    expect(matchSheltersToRoute(route, [shelterAt(0, 'start')])).toHaveLength(0);
    const dup = matchSheltersToRoute(route, [shelterAt(3, 'a'), shelterAt(3, 'b')]);
    expect(dup).toHaveLength(1);
  });
});

describe('planDays', () => {
  it('returns a single leg when the whole route fits under the cap', () => {
    const plan = planDays(makeRoute([0, 1, 2, 3]), [], { capSeconds: 8 * H });
    expect(plan.days).toHaveLength(1);
    expect(plan.days[0]!.shelterAtEnd).toBeNull();
    expect(plan.warnings).toEqual([]);
  });

  it('warns and stays one leg when it exceeds the cap but no shelter can split it', () => {
    const plan = planDays(makeRoute([0, 2, 4, 6, 8, 10]), [], { capSeconds: 8 * H });
    expect(plan.days).toHaveLength(1);
    expect(plan.warnings[0]).toMatch(/no shelters within reach/i);
  });

  it('splits at a shelter when the route is over the cap', () => {
    const route = makeRoute([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]); // 9 h total
    const plan = planDays(route, [shelterAt(6, 'hut6')], {
      targetSeconds: 6 * H,
      capSeconds: 8 * H,
    });
    expect(plan.days).toHaveLength(2);
    expect(plan.days[0]!.endIndex).toBe(6);
    expect(plan.days[0]!.shelterAtEnd?.id).toBe('hut6');
    expect(plan.days[0]!.movingSeconds).toBeCloseTo(6 * H, 0);
    expect(plan.days[1]!.shelterAtEnd).toBeNull(); // final leg ends at the route end
    plan.days.forEach((d) => expect(d.movingSeconds).toBeLessThanOrEqual(8 * H));
  });

  it('chooses the lower-squared-error split among candidate shelters', () => {
    const route = makeRoute([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]); // 9 h
    // Ending day 1 at 4 h (→ 4 h + 5 h, err 4+1=5) beats 6 h (→ 6 h + 3 h, err 0+9=9).
    const plan = planDays(route, [shelterAt(4, 'hut4'), shelterAt(6, 'hut6')], {
      targetSeconds: 6 * H,
      capSeconds: 8 * H,
    });
    expect(plan.days).toHaveLength(2);
    expect(plan.days[0]!.endIndex).toBe(4);
  });
});
