import { useAppStore } from '../state/store';
import { nextThemePref } from '../lib/theme';

const ICON: Record<string, string> = { light: '☀️', dark: '🌙', system: '🖥️' };

/** Cycles light → dark → system; the applied class + persistence live in useApplyTheme. */
export function ThemeToggle() {
  const pref = useAppStore((s) => s.themePref);
  const setPref = useAppStore((s) => s.setThemePref);
  return (
    <button
      type="button"
      aria-label={`Theme: ${pref}`}
      onClick={() => setPref(nextThemePref(pref))}
      className="rounded-lg bg-white px-3 py-2 text-sm shadow-fab dark:bg-neutral-800"
    >
      <span aria-hidden="true">{ICON[pref]}</span>
    </button>
  );
}
