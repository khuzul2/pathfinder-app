/**
 * User-selectable routing preferences. `avoidRoads` maps to the ORS foot profile: `foot-hiking`
 * strongly prefers trails/paths, `foot-walking` takes more direct routes that use roads. The
 * overnight fields drive auto stop-insertion (P8-2b).
 */
export type OrsProfile = 'foot-hiking' | 'foot-walking';

export type StayType = 'hut' | 'camp' | 'hotel' | 'guesthouse' | 'bivvy';

export interface RoutingOptions {
  /** Prefer trails/paths, avoiding vehicle-traffic roads as much as possible. */
  avoidRoads: boolean;
  /** Which overnight stop types are acceptable (bivvy = wild camp anywhere). */
  stayTypes: Record<StayType, boolean>;
  /** How far off the route (metres) a shelter may sit and still count as an overnight stop. */
  shelterBufferMeters: number;
  /** Offer to reroute the path through a water source at least once per day. */
  waterStops: boolean;
}

/** Selectable shelter search radii (metres) — a wider radius finds more, slightly-off-route stays. */
export const SHELTER_BUFFER_OPTIONS = [500, 1000, 1500, 2000, 2500] as const;

export const DEFAULT_ROUTING_OPTIONS: RoutingOptions = {
  avoidRoads: true,
  stayTypes: { hut: true, camp: true, hotel: false, guesthouse: false, bivvy: false },
  shelterBufferMeters: 1000,
  waterStops: false,
};

/** Options passed down the data layer for a single route request. */
export interface RouteFetchOptions {
  profile?: OrsProfile;
}

/** The ORS foot profile for the chosen road preference. */
export function orsProfile(avoidRoads: boolean): OrsProfile {
  return avoidRoads ? 'foot-hiking' : 'foot-walking';
}
