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

  it('soft-splits at the reachable shelters even when a gap exceeds the cap', () => {
    // 20 h route; the only shelter sits at 9 h. Day 1 (0→9 h) is over the 8 h cap, but soft mode
    // still splits there rather than collapsing to a single 20 h leg.
    const route = makeRoute([0, 3, 6, 9, 12, 15, 18, 20]);
    const plan = planDays(route, [shelterAt(3, 'hut9')], {
      targetSeconds: 6 * H,
      capSeconds: 8 * H,
    });
    expect(plan.days).toHaveLength(2);
    expect(plan.days[0]!.endIndex).toBe(3);
    expect(plan.days[0]!.shelterAtEnd?.id).toBe('hut9');
    expect(plan.warnings[0]).toMatch(/exceed the daily limit/i);
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

  describe('desired hours/day range', () => {
    it('aims for the middle of the band and flags no day when all legs fit', () => {
      // 12 h route, shelters every 4 h; band 4–8 h aims for 6 h → two ~6 h days, both in range.
      const route = makeRoute([0, 2, 4, 6, 8, 10, 12]);
      const plan = planDays(route, [shelterAt(2, 'h4'), shelterAt(3, 'h6'), shelterAt(4, 'h8')], {
        minSeconds: 4 * H,
        maxSeconds: 8 * H,
      });
      expect(plan.days).toHaveLength(2);
      expect(plan.days[0]!.endIndex).toBe(3); // 6 h — the mid-band ideal
      plan.days.forEach((d) => expect(d.outsideRange).toBe(false));
    });

    it('flags a leg that is forced longer than the band max', () => {
      // 20 h route; the only shelter sits at 9 h, past the 8 h band max → day 1 flagged out of range.
      const route = makeRoute([0, 3, 6, 9, 12, 15, 18, 20]);
      const plan = planDays(route, [shelterAt(3, 'hut9')], {
        minSeconds: 4 * H,
        maxSeconds: 8 * H,
      });
      expect(plan.days).toHaveLength(2);
      expect(plan.days[0]!.movingSeconds).toBeCloseTo(9 * H, 0);
      expect(plan.days[0]!.outsideRange).toBe(true);
    });

    it('flags a leg that is shorter than the band min', () => {
      // 10 h route split at the 8 h shelter → a 2 h finish leg, below the 4 h band min.
      const route = makeRoute([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      const plan = planDays(route, [shelterAt(8, 'hut8')], {
        minSeconds: 4 * H,
        maxSeconds: 8 * H,
      });
      const last = plan.days[plan.days.length - 1]!;
      expect(last.movingSeconds).toBeLessThan(4 * H);
      expect(last.outsideRange).toBe(true);
    });
  });

  describe('bivvy (wild camp anywhere)', () => {
    it('splits a shelterless over-cap route into wild-camp days at the ideal spacing', () => {
      const route = makeRoute([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]); // 10 h
      const plan = planDays(route, [], {
        targetSeconds: 5 * H,
        capSeconds: 8 * H,
        allowBivvy: true,
      });
      expect(plan.warnings).toEqual([]);
      expect(plan.days).toHaveLength(2);
      expect(plan.days[0]!.endIndex).toBe(5); // ideal 5 h
      expect(plan.days[0]!.shelterAtEnd?.kind).toBe('bivvy');
      expect(plan.days[0]!.shelterAtEnd?.name).toBe('Wild camp');
      expect(plan.days[1]!.shelterAtEnd).toBeNull();
    });

    it('prefers a real shelter near the ideal over a wild camp', () => {
      const route = makeRoute([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]); // 10 h
      const plan = planDays(route, [shelterAt(5, 'hut5')], {
        targetSeconds: 5 * H,
        capSeconds: 8 * H,
        allowBivvy: true,
      });
      expect(plan.days[0]!.endIndex).toBe(5);
      expect(plan.days[0]!.shelterAtEnd?.kind).toBe('alpine_hut');
    });

    it('bivvies at the ideal when the only shelter is far off-target', () => {
      const route = makeRoute([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]); // 10 h
      // A hut at 8 h is well past the 5 h ideal → a wild camp near 5 h wins.
      const plan = planDays(route, [shelterAt(8, 'hut8')], {
        targetSeconds: 5 * H,
        capSeconds: 8 * H,
        allowBivvy: true,
      });
      expect(plan.days[0]!.endIndex).toBe(5);
      expect(plan.days[0]!.shelterAtEnd?.kind).toBe('bivvy');
    });
  });
});
