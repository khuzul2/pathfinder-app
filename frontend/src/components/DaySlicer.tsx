import { useMemo } from 'react';
import { useAppStore } from '../state/store';
import { formatDistance, formatDuration } from '../lib/route';
import { insertOvernightStops } from '../lib/overnightStops';
import { insertWaterStops } from '../lib/waterStops';

const HOURS_MIN = 1;
const HOURS_MAX = 14;

const STAY_ICON: Record<string, string> = {
  alpine_hut: '🏠',
  camp_site: '⛺',
  bivvy: '🌙',
};

/** Desired hours/day range control + the resulting day-by-day breakdown. Hidden until a route exists. */
export function DaySlicer() {
  const route = useAppStore((s) => s.route);
  const plan = useAppStore((s) => s.slicePlan);
  const hoursRange = useAppStore((s) => s.hoursRange);
  const setHoursRange = useAppStore((s) => s.setHoursRange);
  const waypoints = useAppStore((s) => s.waypoints);
  const setWaypoints = useAppStore((s) => s.setWaypoints);
  const routeSprings = useAppStore((s) => s.routeSprings);
  const waterStopsOn = useAppStore((s) => s.routingOptions.waterStops);
  const sheltersLoading = useAppStore((s) => s.sheltersLoading);

  // Keep the band ordered as either thumb is dragged past the other.
  const setMin = (v: number) =>
    setHoursRange({ min: Math.min(v, hoursRange.max), max: hoursRange.max });
  const setMax = (v: number) =>
    setHoursRange({ min: hoursRange.min, max: Math.max(v, hoursRange.min) });

  // Preview the one-shot stop insertions (memoized — these scan the route geometry). Each self-hides
  // once its stops are already on the route, so pressing it can never loop.
  const overnight = useMemo(
    () =>
      route && plan && waypoints.length >= 2
        ? insertOvernightStops(route.points, waypoints, plan)
        : null,
    [route, plan, waypoints],
  );
  const water = useMemo(
    () =>
      route && plan && waterStopsOn && waypoints.length >= 2
        ? insertWaterStops(route.points, waypoints, plan, routeSprings)
        : null,
    [route, plan, waterStopsOn, waypoints, routeSprings],
  );

  if (!route) return null;
  const days = plan?.days ?? [];
  const multiDay = days.length > 1;
  const canRouteThrough = (overnight?.inserted ?? 0) > 0;
  const canAddWater = (water?.inserted ?? 0) > 0;

  return (
    <section
      aria-label="Day plan"
      className="rounded-lg bg-white/95 px-4 py-2 text-slate-accent shadow-fab dark:bg-neutral-800/95 dark:text-neutral-100"
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wide opacity-60">Hours / day</span>
        <span className="text-xs font-medium tabular-nums">
          {hoursRange.min}h–{hoursRange.max}h
        </span>
      </div>
      <div className="mt-1 flex flex-col gap-1" aria-label="Desired hours per day range">
        <label className="flex items-center gap-2 text-xs">
          <span className="w-7 shrink-0 opacity-60">Min</span>
          <input
            type="range"
            aria-label="Minimum hours per day"
            min={HOURS_MIN}
            max={HOURS_MAX}
            step={1}
            value={hoursRange.min}
            onChange={(e) => setMin(Number(e.target.value))}
            className="flex-1 accent-trail-green"
          />
        </label>
        <label className="flex items-center gap-2 text-xs">
          <span className="w-7 shrink-0 opacity-60">Max</span>
          <input
            type="range"
            aria-label="Maximum hours per day"
            min={HOURS_MIN}
            max={HOURS_MAX}
            step={1}
            value={hoursRange.max}
            onChange={(e) => setMax(Number(e.target.value))}
            className="flex-1 accent-trail-green"
          />
        </label>
      </div>

      {!sheltersLoading &&
        plan?.warnings.map((w) => (
          <p key={w} role="note" className="mt-1 text-xs text-hazard-coral">
            {w}
          </p>
        ))}

      {multiDay && (
        <ol className="mt-2 flex flex-col gap-1">
          {days.map((d) => {
            const out = d.outsideRange ?? false;
            const tooLong = d.movingSeconds > hoursRange.max * 3600 + 1;
            return (
              <li key={d.index} className="text-sm">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-medium">Day {d.index + 1}</span>
                  <span
                    className={`tabular-nums ${out ? 'font-medium text-hazard-coral' : 'opacity-80'}`}
                  >
                    {formatDuration(d.movingSeconds)} · {formatDistance(d.distanceMeters)}
                  </span>
                  <span className="truncate text-right opacity-70">
                    {d.shelterAtEnd
                      ? `${STAY_ICON[d.shelterAtEnd.kind] ?? '🏠'} ${d.shelterAtEnd.name ?? 'Shelter'}`
                      : '🏁 Finish'}
                  </span>
                </div>
                {out && (
                  <p role="note" className="text-[11px] text-hazard-coral">
                    ⚠ {tooLong ? 'Longer' : 'Shorter'} than your {hoursRange.min}–{hoursRange.max}h
                    range
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {canRouteThrough && (
        <button
          type="button"
          onClick={() => setWaypoints(overnight!.waypoints)}
          className="mt-2 w-full rounded-md border border-trail-green bg-trail-green/10 px-2 py-1.5 text-xs font-semibold text-trail-green transition-colors hover:bg-trail-green/20"
        >
          ➕ Route through {overnight!.inserted} overnight stop
          {overnight!.inserted > 1 ? 's' : ''}
        </button>
      )}

      {canAddWater && (
        <button
          type="button"
          onClick={() => setWaypoints(water!.waypoints)}
          className="mt-2 w-full rounded-md border border-cyan-500 bg-cyan-500/10 px-2 py-1.5 text-xs font-semibold text-cyan-600 transition-colors hover:bg-cyan-500/20 dark:text-cyan-400"
        >
          💧 Route through {water!.inserted} water source{water!.inserted > 1 ? 's' : ''}
        </button>
      )}
    </section>
  );
}
