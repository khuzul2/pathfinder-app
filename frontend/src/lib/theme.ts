/**
 * Theme resolution & persistence (pure). Storage is injected so this is fully unit-testable
 * without a real DOM. The applied `dark` class + `prefers-color-scheme` wiring lives in the
 * `useApplyTheme` hook. See SPEC §5.
 */
export type ThemePref = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'pathfinder:theme';

export function isThemePref(value: unknown): value is ThemePref {
  return value === 'light' || value === 'dark' || value === 'system';
}

export function resolveTheme(pref: ThemePref, systemPrefersDark: boolean): ResolvedTheme {
  if (pref === 'system') return systemPrefersDark ? 'dark' : 'light';
  return pref;
}

export function loadThemePref(storage: Pick<Storage, 'getItem'>): ThemePref {
  const stored = storage.getItem(THEME_STORAGE_KEY);
  return isThemePref(stored) ? stored : 'system';
}

export function saveThemePref(storage: Pick<Storage, 'setItem'>, pref: ThemePref): void {
  storage.setItem(THEME_STORAGE_KEY, pref);
}

/** Cycle order for the toggle button: system → light → dark → system. */
export function nextThemePref(current: ThemePref): ThemePref {
  if (current === 'system') return 'light';
  if (current === 'light') return 'dark';
  return 'system';
}
