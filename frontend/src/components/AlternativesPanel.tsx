import { useAppStore } from '../state/store';
import { labelAlternatives } from '../lib/alternatives';
import { formatDistance, formatDuration } from '../lib/route';

/** Route options to pick from (recommended + alternatives). Hidden unless more than one exists. */
export function AlternativesPanel() {
  const alternatives = useAppStore((s) => s.alternatives);
  const selectedRouteIndex = useAppStore((s) => s.selectedRouteIndex);
  const selectRoute = useAppStore((s) => s.selectRoute);

  if (alternatives.length < 2) return null;
  const labelled = labelAlternatives(alternatives);

  return (
    <section aria-label="Route alternatives" className="flex flex-col gap-1">
      <span className="text-[11px] uppercase tracking-wide opacity-60">Alternatives</span>
      <div className="flex flex-col gap-1">
        {labelled.map((alt, i) => {
          const selected = i === selectedRouteIndex;
          return (
            <button
              key={i}
              type="button"
              aria-pressed={selected}
              onClick={() => selectRoute(i)}
              className={`flex flex-col gap-0.5 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                selected
                  ? 'border-trail-green bg-trail-green/10'
                  : 'border-neutral-200 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-700'
              }`}
            >
              <span className="font-medium">{alt.label}</span>
              <span className="tabular-nums opacity-70">
                {formatDuration(alt.route.movingSeconds)} ·{' '}
                {formatDistance(alt.route.distanceMeters)} · ↑{Math.round(alt.route.ascentMeters)} m
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
