import { useAppStore } from '../state/store';

/** User routing preferences. P8-2a ships the trail-preference toggle (overnight controls next). */
export function RoutingOptions() {
  const routingOptions = useAppStore((s) => s.routingOptions);
  const setRoutingOptions = useAppStore((s) => s.setRoutingOptions);

  return (
    <section aria-label="Routing options" className="flex flex-col gap-1">
      <span className="text-[11px] uppercase tracking-wide opacity-60">Routing</span>
      <button
        type="button"
        aria-pressed={routingOptions.avoidRoads}
        onClick={() => setRoutingOptions({ avoidRoads: !routingOptions.avoidRoads })}
        className={`flex items-center gap-2 rounded-md px-2 py-1 text-left text-sm transition-colors ${
          routingOptions.avoidRoads
            ? 'bg-trail-green/15 text-slate-accent dark:text-neutral-100'
            : 'text-slate-accent/60 dark:text-neutral-400'
        }`}
      >
        <span
          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border text-white ${
            routingOptions.avoidRoads ? 'border-trail-green bg-trail-green' : 'border-neutral-400'
          }`}
        >
          {routingOptions.avoidRoads ? '✓' : ''}
        </span>
        <span>
          Prefer trails <span className="opacity-60">(avoid roads)</span>
        </span>
      </button>
    </section>
  );
}
