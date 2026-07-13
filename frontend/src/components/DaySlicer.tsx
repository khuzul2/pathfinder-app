import { useAppStore } from '../state/store';
import { formatDistance, formatDuration } from '../lib/route';

const HOURS_CHOICES = [4, 5, 6, 7, 8];

/** Target hours/day control + the resulting day-by-day breakdown. Hidden until a route exists. */
export function DaySlicer() {
  const route = useAppStore((s) => s.route);
  const plan = useAppStore((s) => s.slicePlan);
  const targetHours = useAppStore((s) => s.targetHours);
  const setTargetHours = useAppStore((s) => s.setTargetHours);

  if (!route) return null;
  const days = plan?.days ?? [];
  const multiDay = days.length > 1;

  return (
    <section
      aria-label="Day plan"
      className="rounded-lg bg-white/95 px-4 py-2 text-slate-accent shadow-fab dark:bg-neutral-800/95 dark:text-neutral-100"
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wide opacity-60">Hours / day</span>
        <div className="flex gap-1" role="group" aria-label="Target hours per day">
          {HOURS_CHOICES.map((h) => (
            <button
              key={h}
              type="button"
              aria-pressed={h === targetHours}
              onClick={() => setTargetHours(h)}
              className={`rounded px-2 py-0.5 text-xs tabular-nums ${
                h === targetHours
                  ? 'bg-trail-green text-white'
                  : 'bg-neutral-100 text-slate-accent dark:bg-neutral-700 dark:text-neutral-100'
              }`}
            >
              {h}h
            </button>
          ))}
        </div>
      </div>

      {plan?.warnings.map((w) => (
        <p key={w} role="note" className="mt-1 text-xs text-hazard-coral">
          {w}
        </p>
      ))}

      {multiDay && (
        <ol className="mt-2 flex flex-col gap-1">
          {days.map((d) => (
            <li key={d.index} className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-medium">Day {d.index + 1}</span>
              <span className="tabular-nums opacity-80">
                {formatDuration(d.movingSeconds)} · {formatDistance(d.distanceMeters)}
              </span>
              <span className="truncate text-right opacity-70">
                {d.shelterAtEnd ? (d.shelterAtEnd.name ?? 'Shelter') : 'Finish'}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
