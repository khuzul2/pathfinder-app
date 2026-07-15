import { useAppStore } from '../state/store';
import { SHELTER_BUFFER_OPTIONS, type StayType } from '../lib/routingOptions';

function Toggle({
  label,
  hint,
  pressed,
  onClick,
}: {
  label: string;
  hint?: string;
  pressed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`flex items-center gap-2 rounded-md px-2 py-1 text-left text-sm transition-colors ${
        pressed
          ? 'bg-trail-green/15 text-slate-accent dark:text-neutral-100'
          : 'text-slate-accent/60 dark:text-neutral-400'
      }`}
    >
      <span
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border text-white ${
          pressed ? 'border-trail-green bg-trail-green' : 'border-neutral-400'
        }`}
      >
        {pressed ? '✓' : ''}
      </span>
      <span>
        {label}
        {hint && <span className="opacity-60"> {hint}</span>}
      </span>
    </button>
  );
}

const STAYS: { kind: StayType; label: string }[] = [
  { kind: 'hut', label: 'Huts' },
  { kind: 'camp', label: 'Campsites' },
  { kind: 'hotel', label: 'Hotels' },
  { kind: 'guesthouse', label: 'B&Bs' },
  { kind: 'bivvy', label: 'Bivvy' },
];

/** User routing preferences: trail preference + auto overnight stays (with stay-type filter). */
export function RoutingOptions() {
  const routingOptions = useAppStore((s) => s.routingOptions);
  const setRoutingOptions = useAppStore((s) => s.setRoutingOptions);
  const { avoidRoads, autoOvernight, stayTypes, shelterBufferMeters, waterStops } = routingOptions;

  const toggleStay = (kind: StayType) =>
    setRoutingOptions({ stayTypes: { ...stayTypes, [kind]: !stayTypes[kind] } });

  return (
    <section aria-label="Routing options" className="flex flex-col gap-1">
      <span className="text-[11px] uppercase tracking-wide opacity-60">Routing</span>

      <Toggle
        label="Prefer trails"
        hint="(avoid roads)"
        pressed={avoidRoads}
        onClick={() => setRoutingOptions({ avoidRoads: !avoidRoads })}
      />
      <Toggle
        label="Auto overnight stays"
        pressed={autoOvernight}
        onClick={() => setRoutingOptions({ autoOvernight: !autoOvernight })}
      />
      <Toggle
        label="Add water stops"
        hint="(≥1 spring/day)"
        pressed={waterStops}
        onClick={() => setRoutingOptions({ waterStops: !waterStops })}
      />

      {autoOvernight && (
        <>
          <div role="group" aria-label="Overnight stay types" className="ml-6 flex flex-wrap gap-1">
            {STAYS.map(({ kind, label }) => (
              <button
                key={kind}
                type="button"
                aria-pressed={stayTypes[kind]}
                onClick={() => toggleStay(kind)}
                className={`rounded-full px-2.5 py-0.5 text-xs transition-colors ${
                  stayTypes[kind]
                    ? 'bg-trail-green text-white'
                    : 'bg-neutral-100 text-slate-accent/70 dark:bg-neutral-700 dark:text-neutral-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="ml-6 mt-1 flex items-center gap-1.5">
            <span className="text-xs opacity-60">Search radius</span>
            <div role="group" aria-label="Shelter search radius" className="flex flex-wrap gap-1">
              {SHELTER_BUFFER_OPTIONS.map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={shelterBufferMeters === m}
                  onClick={() => setRoutingOptions({ shelterBufferMeters: m })}
                  className={`rounded px-1.5 py-0.5 text-xs tabular-nums transition-colors ${
                    shelterBufferMeters === m
                      ? 'bg-trail-green text-white'
                      : 'bg-neutral-100 text-slate-accent/70 dark:bg-neutral-700 dark:text-neutral-300'
                  }`}
                >
                  {m < 1000 ? `${m}m` : `${m / 1000}km`}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
