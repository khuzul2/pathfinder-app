import { useAppStore } from '../state/store';

/** Route builder: the ordered waypoints with delete controls, plus a starting instruction. */
export function WaypointList() {
  const waypoints = useAppStore((s) => s.waypoints);
  const removeWaypoint = useAppStore((s) => s.removeWaypoint);
  const clearWaypoints = useAppStore((s) => s.clearWaypoints);

  if (waypoints.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-neutral-300 px-3 py-4 text-sm text-slate-accent/70 dark:border-neutral-600 dark:text-neutral-300">
        Click the map to drop points — the route snaps to real trails between them. Drag a pin to
        adjust it.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wide opacity-60">
          Waypoints ({waypoints.length})
        </span>
        <button
          type="button"
          onClick={clearWaypoints}
          className="text-xs font-medium text-waypoint-indigo hover:underline"
        >
          Clear all
        </button>
      </div>
      <ol className="flex flex-col gap-1">
        {waypoints.map((wp, i) => (
          <li
            key={`${i}-${wp.lng.toFixed(4)}-${wp.lat.toFixed(4)}`}
            className="flex items-center gap-2 rounded-md bg-neutral-100 px-2 py-1 text-sm dark:bg-neutral-700"
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-waypoint-indigo text-xs font-semibold text-white">
              {i + 1}
            </span>
            <span className="flex-1 truncate tabular-nums opacity-80">
              {wp.lat.toFixed(4)}, {wp.lng.toFixed(4)}
            </span>
            <button
              type="button"
              aria-label={`Remove waypoint ${i + 1}`}
              onClick={() => removeWaypoint(i)}
              className="text-neutral-400 hover:text-hazard-coral"
            >
              ✕
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
