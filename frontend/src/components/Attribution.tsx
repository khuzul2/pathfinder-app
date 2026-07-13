import { ATTRIBUTIONS } from '../lib/mapConfig';

/** Always-visible data-source credits (required by OSM/Mapbox/ORS/RainViewer ToS). */
export function Attribution() {
  return (
    <div
      aria-label="Map data attribution"
      className="absolute bottom-1 right-1 z-10 rounded bg-white/80 px-1.5 py-0.5 text-[10px] leading-tight text-slate-accent dark:bg-neutral-900/80 dark:text-neutral-300"
    >
      {ATTRIBUTIONS.join(' · ')}
    </div>
  );
}
