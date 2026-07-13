import { useAppStore } from '../state/store';
import { formatDistance, formatDuration } from '../lib/route';

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[11px] uppercase tracking-wide opacity-60">{label}</span>
      <span className="text-sm font-medium tabular-nums">{value}</span>
    </div>
  );
}

/** Route summary stats (distance / ascent / descent / Tobler time). Hidden until a route exists. */
export function ElevationCard() {
  const route = useAppStore((s) => s.route);
  const error = useAppStore((s) => s.routeError);

  if (error) {
    return (
      <div
        role="alert"
        className="rounded-lg bg-white/95 px-4 py-2 text-sm text-hazard-coral shadow-fab dark:bg-neutral-800/95"
      >
        Could not compute route: {error}
      </div>
    );
  }

  if (!route) return null;

  return (
    <section
      aria-label="Route summary"
      className="grid grid-cols-4 gap-4 rounded-lg bg-white/95 px-4 py-2 text-slate-accent shadow-fab dark:bg-neutral-800/95 dark:text-neutral-100"
    >
      <Stat label="Distance" value={formatDistance(route.distanceMeters)} />
      <Stat label="Ascent" value={`↑ ${Math.round(route.ascentMeters)} m`} />
      <Stat label="Descent" value={`↓ ${Math.round(route.descentMeters)} m`} />
      <Stat label="Est. time" value={formatDuration(route.movingSeconds)} />
    </section>
  );
}
