import { useAppStore } from '../state/store';
import { difficultyLevel } from '../lib/difficulty';

/** SAC difficulty legend for the grades present in the current route. */
export function DifficultyLegend() {
  const route = useAppStore((s) => s.route);
  if (!route || route.difficultySegments.length === 0) return null;

  const codes = [...new Set(route.difficultySegments.map((s) => s.sac))].sort((a, b) => a - b);

  return (
    <section aria-label="Trail difficulty legend" className="flex flex-col gap-1">
      <span className="text-[11px] uppercase tracking-wide opacity-60">Trail difficulty</span>
      <ul className="flex flex-col gap-0.5">
        {codes.map((code) => {
          const level = difficultyLevel(code);
          return (
            <li key={code} className="flex items-center gap-2 text-xs">
              <span
                className="h-2 w-5 shrink-0 rounded"
                style={{ backgroundColor: level.color }}
                aria-hidden="true"
              />
              {level.label}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
