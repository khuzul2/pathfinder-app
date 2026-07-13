import { buildGpxCourse, type GpxTrackPoint, type GpxWaypoint } from './gpx';
import type { RouteAnalysis } from './route';
import type { SlicePlan, DaySegment } from './slicing';

export interface GpxFile {
  filename: string;
  contents: string;
}

function trackFrom(route: RouteAnalysis, from = 0, to = route.points.length - 1): GpxTrackPoint[] {
  return route.points.slice(from, to + 1).map((p) => ({ lng: p.lng, lat: p.lat, ele: p.ele }));
}

function shelterWaypoints(days: readonly DaySegment[]): GpxWaypoint[] {
  return days
    .filter((d) => d.shelterAtEnd)
    .map((d) => ({
      lng: d.shelterAtEnd!.lng,
      lat: d.shelterAtEnd!.lat,
      name: d.shelterAtEnd!.name ?? 'Shelter',
    }));
}

/** The whole route as one course, with each day's shelter as a waypoint. */
export function buildRouteGpx(route: RouteAnalysis, plan?: SlicePlan | null): string {
  return buildGpxCourse(trackFrom(route), {
    name: 'Pathfinder Route',
    waypoints: shelterWaypoints(plan?.days ?? []),
  });
}

/** One day's leg as its own course (its end shelter as a waypoint). */
export function buildDayGpx(route: RouteAnalysis, day: DaySegment): string {
  return buildGpxCourse(trackFrom(route, day.startIndex, day.endIndex), {
    name: `Pathfinder Day ${day.index + 1}`,
    waypoints: day.shelterAtEnd
      ? [
          {
            lng: day.shelterAtEnd.lng,
            lat: day.shelterAtEnd.lat,
            name: day.shelterAtEnd.name ?? 'Shelter',
          },
        ]
      : [],
  });
}

/**
 * The set of GPX files to export: always a combined whole-route file, plus one per day when
 * the plan is multi-day (SPEC §4 — one course per day for the watch, plus a combined file).
 */
export function buildGpxFiles(route: RouteAnalysis, plan?: SlicePlan | null): GpxFile[] {
  const files: GpxFile[] = [
    { filename: 'pathfinder-route.gpx', contents: buildRouteGpx(route, plan) },
  ];
  if (plan && plan.days.length > 1) {
    for (const day of plan.days) {
      files.push({
        filename: `pathfinder-day-${day.index + 1}.gpx`,
        contents: buildDayGpx(route, day),
      });
    }
  }
  return files;
}
