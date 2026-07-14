import { useState } from 'react';
import { useAppStore } from '../state/store';
import type { Waypoint } from '../state/store';

const START = '#0F9D58';
const END = '#EA4335';
const VIA = '#4285F4';

function roleOf(index: number, total: number): { label: string; color: string } {
  if (index === 0) return { label: 'Start', color: START };
  if (index === total - 1) return { label: 'End', color: END };
  return { label: String(index), color: VIA };
}

function labelOf(wp: Waypoint): string {
  return wp.name ?? `${wp.lat.toFixed(4)}, ${wp.lng.toFixed(4)}`;
}

/** Ordered list of route stops (start · intermediate · end): drag to reorder, ↑↓, reverse, delete. */
export function WaypointList() {
  const waypoints = useAppStore((s) => s.waypoints);
  const removeWaypoint = useAppStore((s) => s.removeWaypoint);
  const moveWaypoint = useAppStore((s) => s.moveWaypoint);
  const reverseWaypoints = useAppStore((s) => s.reverseWaypoints);
  const clearWaypoints = useAppStore((s) => s.clearWaypoints);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  if (waypoints.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-neutral-300 px-3 py-4 text-sm text-slate-accent/70 dark:border-neutral-600 dark:text-neutral-300">
        Search for a place above, or double-click the map to add stops. The route snaps to real
        trails between them — drag a pin to adjust it.
      </p>
    );
  }

  const total = waypoints.length;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wide opacity-60">Stops ({total})</span>
        <div className="flex items-center gap-3">
          {total >= 2 && (
            <button
              type="button"
              onClick={reverseWaypoints}
              aria-label="Reverse route direction"
              className="text-sm text-waypoint-indigo hover:underline"
            >
              ⇅ Reverse
            </button>
          )}
          <button
            type="button"
            onClick={clearWaypoints}
            className="text-xs font-medium text-waypoint-indigo hover:underline"
          >
            Clear all
          </button>
        </div>
      </div>

      <ol className="flex flex-col gap-1">
        {waypoints.map((wp, i) => {
          const role = roleOf(i, total);
          return (
            <li
              key={`${i}-${wp.lng.toFixed(4)}-${wp.lat.toFixed(4)}`}
              draggable
              onDragStart={() => setDragIndex(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragIndex !== null && dragIndex !== i) moveWaypoint(dragIndex, i);
                setDragIndex(null);
              }}
              onDragEnd={() => setDragIndex(null)}
              className={`flex items-center gap-2 rounded-md bg-neutral-100 px-2 py-1 text-sm dark:bg-neutral-700 ${
                dragIndex === i ? 'opacity-40' : ''
              }`}
            >
              <span
                aria-hidden="true"
                title="Drag to reorder"
                className="cursor-grab select-none text-neutral-400"
              >
                ⠿
              </span>
              <span
                className="flex h-5 min-w-[2.5rem] shrink-0 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold uppercase text-white"
                style={{ backgroundColor: role.color }}
              >
                {role.label}
              </span>
              <span className="flex-1 truncate opacity-80" title={labelOf(wp)}>
                {labelOf(wp)}
              </span>
              <div className="flex items-center gap-0.5 text-neutral-400">
                <button
                  type="button"
                  aria-label={`Move stop ${i + 1} up`}
                  disabled={i === 0}
                  onClick={() => moveWaypoint(i, i - 1)}
                  className="px-1 hover:text-slate-accent disabled:opacity-30 dark:hover:text-neutral-100"
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label={`Move stop ${i + 1} down`}
                  disabled={i === total - 1}
                  onClick={() => moveWaypoint(i, i + 1)}
                  className="px-1 hover:text-slate-accent disabled:opacity-30 dark:hover:text-neutral-100"
                >
                  ↓
                </button>
                <button
                  type="button"
                  aria-label={`Remove stop ${i + 1}`}
                  onClick={() => removeWaypoint(i)}
                  className="px-1 hover:text-hazard-coral"
                >
                  ✕
                </button>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
