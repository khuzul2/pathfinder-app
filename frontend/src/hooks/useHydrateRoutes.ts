import { useEffect } from 'react';
import { useAppStore } from '../state/store';

/** Loads saved routes from storage into the store once, on first mount. */
export function useHydrateRoutes() {
  const hydrateRoutes = useAppStore((s) => s.hydrateRoutes);
  useEffect(() => {
    hydrateRoutes();
  }, [hydrateRoutes]);
}
