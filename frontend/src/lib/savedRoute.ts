import { z } from 'zod';
import type { Waypoint } from './geo';
import type { RouteAnalysis } from './route';

/**
 * A persisted route: the stops the user entered (the reproducible input) plus the last computed
 * analysis cached for instant preview/export without a re-fetch. Stored in localStorage today,
 * a per-user cloud row once auth lands — the shape is the same either way.
 */
export interface SavedRoute {
  id: string;
  name: string;
  waypoints: Waypoint[];
  updatedAt: number;
  /** Last analyzed route (cached for map preview + GPX export); null until one is computed. */
  route?: RouteAnalysis | null;
  /** Cached route options (recommended + alternatives) so they reappear when the route is reopened. */
  alternatives?: RouteAnalysis[];
  selectedRouteIndex?: number;
}

const WaypointSchema = z.object({
  lng: z.number(),
  lat: z.number(),
  name: z.string().optional(),
});

const SavedRouteSchema = z.object({
  id: z.string(),
  name: z.string(),
  waypoints: z.array(WaypointSchema),
  updatedAt: z.number(),
  // Our own analysis types — kept opaque here; a stale/missing cache degrades to "open to recompute".
  route: z.unknown().optional(),
  alternatives: z.unknown().optional(),
  selectedRouteIndex: z.number().optional(),
});

/** Build a normalized SavedRoute from the current working state. */
export function makeSavedRoute(opts: {
  id: string;
  name: string;
  waypoints: readonly Waypoint[];
  now: number;
  route?: RouteAnalysis | null;
  alternatives?: readonly RouteAnalysis[];
  selectedRouteIndex?: number;
}): SavedRoute {
  return {
    id: opts.id,
    name: opts.name,
    waypoints: opts.waypoints.map((w) => ({
      lng: w.lng,
      lat: w.lat,
      ...(w.name ? { name: w.name } : {}),
    })),
    updatedAt: opts.now,
    route: opts.route ?? null,
    alternatives: opts.alternatives ? [...opts.alternatives] : opts.route ? [opts.route] : [],
    selectedRouteIndex: opts.selectedRouteIndex ?? 0,
  };
}

/** A friendly default name derived from the named stops (e.g. "Munich → Innsbruck"). */
export function defaultRouteName(waypoints: readonly Waypoint[]): string {
  const named = waypoints.filter((w) => w.name);
  if (named.length >= 2) return `${named[0]!.name} → ${named[named.length - 1]!.name}`;
  if (named.length === 1) return named[0]!.name!;
  return 'Untitled route';
}

export function serializeRoutes(routes: readonly SavedRoute[]): string {
  return JSON.stringify(routes);
}

/** Parse a persisted routes blob, tolerating absent/corrupt data (returns []). */
export function deserializeRoutes(raw: string | null | undefined): SavedRoute[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  const result = z.array(SavedRouteSchema).safeParse(parsed);
  return result.success ? (result.data as SavedRoute[]) : [];
}
