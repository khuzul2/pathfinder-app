import { useEffect } from 'react';
import { useAppStore } from '../state/store';
import { planDays, type Shelter } from '../lib/slicing';
import { sheltersFrom } from '../lib/poiApi';

/**
 * Recomputes the multi-day slice plan (pure, synchronous) whenever the route, the discovered
 * shelters, the target hours, or the user's pinned stops change. If the user has pinned any
 * stops, only those are used; otherwise the DP auto-picks from all reachable shelters.
 */
export function useDayPlan() {
  const route = useAppStore((s) => s.route);
  const pois = useAppStore((s) => s.pois);
  const targetHours = useAppStore((s) => s.targetHours);
  const forcedStopIds = useAppStore((s) => s.forcedStopIds);
  const setSlicePlan = useAppStore((s) => s.setSlicePlan);

  useEffect(() => {
    if (!route || route.points.length < 2) {
      setSlicePlan(null);
      return;
    }
    let shelters: Shelter[] = sheltersFrom(pois);
    if (forcedStopIds.length > 0) {
      shelters = shelters.filter((s) => forcedStopIds.includes(s.id));
    }
    setSlicePlan(planDays(route.points, shelters, { targetSeconds: targetHours * 3600 }));
  }, [route, pois, targetHours, forcedStopIds, setSlicePlan]);
}
