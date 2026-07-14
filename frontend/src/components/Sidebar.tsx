import { RoutesPanel } from './RoutesPanel';
import { SearchBox } from './SearchBox';
import { WaypointList } from './WaypointList';
import { ElevationCard } from './ElevationCard';
import { ElevationChart } from './ElevationChart';
import { DaySlicer } from './DaySlicer';
import { DifficultyLegend } from './DifficultyLegend';
import { ExportButton } from './ExportButton';
import { LayerControls } from './LayerControls';

/**
 * The full route-planning workspace, shared by the desktop sidebar and the mobile sheet.
 * Sections that need a route (summary, chart, day plan, legend, export) hide themselves until
 * one exists, so an empty planner shows just the builder instructions + layer controls.
 */
export function Sidebar() {
  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4 text-slate-accent dark:text-neutral-100">
      <header>
        <h1 className="font-heading text-xl font-medium">Pathfinder</h1>
        <p className="text-xs opacity-60">Topographic hiking planner</p>
      </header>

      <RoutesPanel />

      <div className="border-t border-neutral-200 dark:border-neutral-700" />

      <section aria-label="Route builder" className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">Plan a route</h2>
        <SearchBox />
        <WaypointList />
      </section>

      <ElevationCard />
      <ElevationChart />
      <DaySlicer />
      <DifficultyLegend />
      <ExportButton />

      <div className="mt-auto border-t border-neutral-200 pt-3 dark:border-neutral-700">
        <LayerControls />
      </div>
    </div>
  );
}
