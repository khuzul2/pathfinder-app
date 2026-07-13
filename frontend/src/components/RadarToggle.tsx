import { useAppStore } from '../state/store';

/** FAB-style toggle for the rain-radar overlay. */
export function RadarToggle() {
  const enabled = useAppStore((s) => s.radarEnabled);
  const toggle = useAppStore((s) => s.toggleRadar);
  return (
    <button
      type="button"
      aria-pressed={enabled}
      aria-label="Toggle rain radar"
      onClick={toggle}
      className={`rounded-lg px-3 py-2 text-sm font-medium shadow-fab transition-colors ${
        enabled
          ? 'bg-waypoint-indigo text-white'
          : 'bg-white text-slate-accent dark:bg-neutral-800 dark:text-neutral-100'
      }`}
    >
      Radar
    </button>
  );
}
