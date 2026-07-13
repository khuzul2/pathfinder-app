import { MapCanvas } from './components/MapCanvas';
import { RadarToggle } from './components/RadarToggle';
import { ThemeToggle } from './components/ThemeToggle';
import { Attribution } from './components/Attribution';
import { RoutePanel } from './components/RoutePanel';
import { MobileSheet } from './components/MobileSheet';
import { useApplyTheme } from './hooks/useApplyTheme';
import { useRoute } from './hooks/useRoute';
import { usePois } from './hooks/usePois';
import { useDayPlan } from './hooks/useDayPlan';
import { useAppStore } from './state/store';

/**
 * App shell: fullscreen map with floating controls + a bottom route panel. The mobile
 * bottom sheet and sidebar refinements arrive in Phase 5.
 */
export function App() {
  useApplyTheme();
  useRoute(); // fetches + analyzes the route whenever waypoints change
  usePois(); // fetches POIs for the viewport (zoom-gated)
  useDayPlan(); // recomputes the multi-day slice plan

  const waypointCount = useAppStore((s) => s.waypoints.length);
  const clearWaypoints = useAppStore((s) => s.clearWaypoints);

  return (
    <div className="relative h-full w-full bg-canvas-light dark:bg-canvas-dark">
      <MapCanvas />

      <header className="pointer-events-none absolute left-4 top-4 z-10 flex items-center gap-2 rounded-lg bg-white/90 px-3 py-2 shadow-fab dark:bg-neutral-800/90">
        <h1 className="font-heading text-lg font-medium text-slate-accent dark:text-neutral-100">
          Pathfinder
        </h1>
      </header>

      <div className="absolute right-4 top-4 z-10 flex gap-2">
        {waypointCount > 0 && (
          <button
            type="button"
            onClick={clearWaypoints}
            className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-slate-accent shadow-fab dark:bg-neutral-800 dark:text-neutral-100"
          >
            Clear
          </button>
        )}
        <RadarToggle />
        <ThemeToggle />
      </div>

      {/* Desktop: floating panel. Mobile: a Vaul bottom sheet (below). */}
      <div className="pointer-events-none absolute inset-x-0 bottom-4 z-10 mx-auto hidden max-w-3xl px-4 md:block">
        <div className="pointer-events-auto">
          <RoutePanel />
        </div>
      </div>
      <MobileSheet />

      <Attribution />
    </div>
  );
}
