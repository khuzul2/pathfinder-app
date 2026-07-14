import { deserializeRoutes, serializeRoutes, type SavedRoute } from '../lib/savedRoute';

const STORAGE_KEY = 'pathfinder.routes.v1';

/**
 * Persistence for saved routes. `localRouteStorage` keeps them in the browser (single device,
 * no account) — good enough to ship today. A `supabaseRouteStorage` implementing the same
 * shape will replace it for per-user cloud sync once Google login lands (ADR-014).
 */
export interface RouteStorage {
  load: () => SavedRoute[];
  save: (routes: readonly SavedRoute[]) => void;
}

function storage(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null; // access can throw (privacy mode / disabled storage)
  }
}

export const localRouteStorage: RouteStorage = {
  load() {
    return deserializeRoutes(storage()?.getItem(STORAGE_KEY) ?? null);
  },
  save(routes) {
    try {
      storage()?.setItem(STORAGE_KEY, serializeRoutes(routes));
    } catch {
      // Quota exceeded / storage disabled — non-fatal; the in-memory list still works this session.
    }
  },
};
