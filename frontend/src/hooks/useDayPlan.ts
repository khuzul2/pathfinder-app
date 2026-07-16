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
  const hoursRange = useAppStore((s) => s.hoursRange);
  const forcedStopIds = useAppStore((s) => s.forcedStopIds);
  const routingOptions = useAppStore((s) => s.routingOptions);
  const overnightNonce = useAppStore((s) => s.overnightNonce);
  const setSlicePlan = useAppStore((s) => s.setSlicePlan);

  useEffect(() => {
    // Overnight planning is on demand: no day itinerary until the user presses "Plan overnight stays".
    if (overnightNonce === 0 || !route || route.points.length < 2) {
      setSlicePlan(null);
      return;
    }
    const { stayTypes } = routingOptions;
    // Only the enabled shelter types are candidates; bivvy allows a wild camp anywhere.
    let shelters: Shelter[] = sheltersFrom(routeShelters).filter((s) =>
      stayEnabled(s.kind, stayTypes),
    );
    if (forcedStopIds.length > 0) {
      shelters = shelters.filter((s) => forcedStopIds.includes(s.id));
    }
    setSlicePlan(
      planDays(route.points, shelters, {
        minSeconds: hoursRange.min * 3600,
        maxSeconds: hoursRange.max * 3600,
        bufferMeters: routingOptions.shelterBufferMeters,
        allowBivvy: stayTypes.bivvy,
      }),
    );
  }, [
    route,
    routeShelters,
    hoursRange,
    forcedStopIds,
    routingOptions,
    overnightNonce,
    setSlicePlan,
  ]);
}
