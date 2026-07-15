import { useEffect, type ReactNode } from 'react';
import { useAppStore } from '../state/store';
import { isSearchStale } from '../lib/mapArea';
import { LAYER_SEARCH_MIN_ZOOM } from '../lib/constants';

/**
 * Floating "Search this area" control (Google-Maps pattern). Viewport-bound layers (POIs, community
 * hikes) load for the committed `dataArea`, not the live viewport — so panning/zooming doesn't
 * thrash the network. This control:
 *  - auto-loads once when a layer is first enabled at a usable zoom;
 *  - shows "Search this area" when the view has drifted from the loaded area;
 *  - shows a "zoom in" hint when the view is too large to load (avoids pulling a whole continent);
 *  - shows a spinner while fetching.
 */
export function MapSearchControl() {
  const viewportBbox = useAppStore((s) => s.viewportBbox);
  const viewportZoom = useAppStore((s) => s.viewportZoom);
  const dataArea = useAppStore((s) => s.dataArea);
  const communityHikesEnabled = useAppStore((s) => s.communityHikesEnabled);
  const poiFilters = useAppStore((s) => s.poiFilters);
  const poiLoading = useAppStore((s) => s.poiLoading);
  const hikeLoading = useAppStore((s) => s.hikeLoading);
  const searchArea = useAppStore((s) => s.searchArea);
  const clearDataArea = useAppStore((s) => s.clearDataArea);

  const anyLayerOn = communityHikesEnabled || Object.values(poiFilters).some(Boolean);
  const tooZoomedOut = viewportZoom > 0 && viewportZoom < LAYER_SEARCH_MIN_ZOOM;
  const stale = !dataArea || (viewportBbox != null && isSearchStale(dataArea, viewportBbox));
  const loading = poiLoading || hikeLoading;

  // Auto-load once when a layer is enabled and the view is usable (so enabling "just works"); after
  // that, further moves surface the manual button.
  useEffect(() => {
    if (anyLayerOn && !tooZoomedOut && viewportBbox && !dataArea) searchArea();
  }, [anyLayerOn, tooZoomedOut, viewportBbox, dataArea, searchArea]);

  // Turning every viewport layer off resets the area, so re-enabling re-initialises cleanly.
  useEffect(() => {
    if (!anyLayerOn && dataArea) clearDataArea();
  }, [anyLayerOn, dataArea, clearDataArea]);

  if (!anyLayerOn || !viewportBbox) return null;

  const pill =
    'pointer-events-auto rounded-full bg-white/95 px-4 py-2 text-sm font-medium text-slate-accent shadow-fab dark:bg-neutral-800/95 dark:text-neutral-100';

  let content: ReactNode = null;
  if (loading) {
    content = (
      <span className={`${pill} flex items-center gap-2`} role="status">
        <span className="h-3 w-3 animate-pulse rounded-full bg-trail-green" aria-hidden="true" />
        Searching this area…
      </span>
    );
  } else if (tooZoomedOut) {
    content = (
      <span className={`${pill} opacity-90`} role="status">
        Zoom in to load hikes &amp; places
      </span>
    );
  } else if (stale) {
    content = (
      <button type="button" onClick={searchArea} className={`${pill} hover:bg-white`}>
        🔍 Search this area
      </button>
    );
  }

  if (!content) return null;
  return (
    <div className="pointer-events-none absolute left-1/2 top-4 z-10 -translate-x-1/2">
      {content}
    </div>
  );
}
