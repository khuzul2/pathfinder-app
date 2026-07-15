import { useEffect } from 'react';
import { useAppStore } from '../state/store';
import { planDays, type Shelter } from '../lib/slicing';
import { sheltersFrom } from '../lib/poiApi';
import type { RoutingOptions } from '../lib/routingOptions';

/** Which shelter kinds the day-planner may use, given the stay-type toggles. */
function stayEnabled(kind: string, stayTypes: RoutingOptions['stayTypes']): boolean {
  if (kind === 'alpine_hut') return stayTypes.hut;
  if (kind === 'camp_site') return stayTypes.camp;
  if (kind === 'hotel') return stayTypes.hotel;
  if (kind === 'guesthouse') return stayTypes.guesthouse;
  return false;
}

/**
 * Recomputes the multi-day slice plan (pure, synchronous) whenever the route, the discovered
 * shelters, the target hours, or the user's pinned stops change. Shelters come from
 * `routeShelters` (fetched for the WHOLE route corridor, not just the viewport), so a long route
 * shown zoomed-out still finds shelters. If the user pinned any stops, only those are used;
 * otherwise the DP auto-picks from all reachable shelters.
 */
export function useDayPlan() {
  const route = useAppStore((s) => s.route);
  const routeShelters = useAppStore((s) => s.routeShelters);
  const targetHours = useAppStore((s) => s.targetHours);
  const forcedStopIds = useAppStore((s) => s.forcedStopIds);
  const routingOptions = useAppStore((s) => s.routingOptions);
  const setSlicePlan = useAppStore((s) => s.setSlicePlan);

  useEffect(() => {
    if (!route || route.points.length < 2) {
      setSlicePlan(null);
      return;
    }
    const { autoOvernight, stayTypes } = routingOptions;
    // Auto overnight off → treat the whole route as a single push (no cap → one leg).
    if (!autoOvernight) {
      setSlicePlan(planDays(route.points, [], { capSeconds: Number.POSITIVE_INFINITY }));
      return;
    }
    // Only the enabled shelter types are candidates; bivvy allows a wild camp anywhere.
    let shelters: Shelter[] = sheltersFrom(routeShelters).filter((s) =>
      stayEnabled(s.kind, stayTypes),
    );
    if (forcedStopIds.length > 0) {
      shelters = shelters.filter((s) => forcedStopIds.includes(s.id));
    }
    setSlicePlan(
      planDays(route.points, shelters, {
        targetSeconds: targetHours * 3600,
        bufferMeters: routingOptions.shelterBufferMeters,
        allowBivvy: stayTypes.bivvy,
      }),
    );
  }, [route, routeShelters, targetHours, forcedStopIds, routingOptions, setSlicePlan]);
}
