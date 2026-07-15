import { MapCanvas } from './components/MapCanvas';
import { ThemeToggle } from './components/ThemeToggle';
import { Attribution } from './components/Attribution';
import { Sidebar } from './components/Sidebar';
import { MobileSheet } from './components/MobileSheet';
import { useApplyTheme } from './hooks/useApplyTheme';
import { useRoute } from './hooks/useRoute';
import { usePois } from './hooks/usePois';
import { useRouteShelters } from './hooks/useRouteShelters';
import { useCommunityHikes } from './hooks/useCommunityHikes';
import { useRadar } from './hooks/useRadar';
import { useDayPlan } from './hooks/useDayPlan';
import { useRouteAutosave } from './hooks/useRouteAutosave';
import { useHydrateRoutes } from './hooks/useHydrateRoutes';

/**
 * App shell: a desktop sidebar (route planner) beside a fullscreen map; on mobile the map is
 * fullscreen with the planner in a Vaul bottom sheet.
 */
export function App() {
  useApplyTheme();
  useHydrateRoutes(); // load saved routes from storage on first mount
  useRoute(); // fetches + analyzes the route whenever waypoints change
  usePois(); // fetches POIs for the viewport (zoom-gated)
  useRouteShelters(); // fetches overnight shelters along the whole route (viewport-independent)
  useCommunityHikes(); // fetches named hikes in view when the community-hikes overlay is on
  useRadar(); // fetches the radar frame index when the overlay is on
  useDayPlan(); // recomputes the multi-day slice plan
  useRouteAutosave(); // autosaves the working route into "My routes"

  return (
    <div className="flex h-full w-full bg-canvas-light dark:bg-canvas-dark">
      <aside className="hidden w-[380px] shrink-0 border-r border-neutral-200 bg-white md:flex dark:border-neutral-700 dark:bg-neutral-800">
        <Sidebar />
      </aside>

      <div className="relative flex-1">
        <MapCanvas />

        <div className="absolute right-4 top-4 z-10 flex gap-2">
          <ThemeToggle />
        </div>

        <Attribution />
        <MobileSheet />
      </div>
    </div>
  );
}
