import { useEffect } from 'react';
import { useAppStore } from '../state/store';
import { useDebouncedValue } from './useDebouncedValue';

/**
 * Debounced autosave: whenever the working route's stops or computed analysis change, upsert it
 * into the saved-routes list (which persists to storage). `persistCurrent` no-ops when there are
 * no stops, so a cleared/new route never creates an empty entry.
 */
export function useRouteAutosave() {
  const waypoints = useAppStore((s) => s.waypoints);
  const route = useAppStore((s) => s.route);
  const persistCurrent = useAppStore((s) => s.persistCurrent);

  // A content signature so the debounce fires only on real changes, not every render.
  const signature =
    waypoints.map((w) => `${w.lng},${w.lat},${w.name ?? ''}`).join('|') +
    '#' +
    (route ? `${route.points.length}:${route.distanceMeters}` : 'none');
  const debounced = useDebouncedValue(signature, 800);

  useEffect(() => {
    persistCurrent();
  }, [debounced, persistCurrent]);
}
