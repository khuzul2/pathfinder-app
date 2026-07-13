import { DaySlicer } from './DaySlicer';
import { ElevationCard } from './ElevationCard';
import { ElevationChart } from './ElevationChart';
import { ExportButton } from './ExportButton';

/** The route workspace content, shared by the desktop floating panel and the mobile sheet. */
export function RoutePanel() {
  return (
    <div className="flex flex-col gap-2">
      <DaySlicer />
      <ElevationCard />
      <ElevationChart />
      <ExportButton />
    </div>
  );
}
