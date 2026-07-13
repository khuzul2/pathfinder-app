import { MapCanvas } from './components/MapCanvas';
import { RadarToggle } from './components/RadarToggle';
import { ThemeToggle } from './components/ThemeToggle';
import { Attribution } from './components/Attribution';
import { useApplyTheme } from './hooks/useApplyTheme';

/**
 * App shell: fullscreen map with floating controls. The sidebar/elevation card and mobile
 * bottom sheet arrive in Phases 3–5.
 */
export function App() {
  useApplyTheme();

  return (
    <div className="relative h-full w-full bg-canvas-light dark:bg-canvas-dark">
      <MapCanvas />

      <header className="pointer-events-none absolute left-4 top-4 z-10 flex items-center gap-2 rounded-lg bg-white/90 px-3 py-2 shadow-fab dark:bg-neutral-800/90">
        <h1 className="font-heading text-lg font-medium text-slate-accent dark:text-neutral-100">
          Pathfinder
        </h1>
      </header>

      <div className="absolute right-4 top-4 z-10 flex gap-2">
        <RadarToggle />
        <ThemeToggle />
      </div>

      <Attribution />
    </div>
  );
}
