import { useEffect } from 'react';
import { useAppStore } from '../state/store';
import { resolveTheme, saveThemePref } from '../lib/theme';

/**
 * Applies the resolved theme to <html> (Tailwind `dark` class), persists the preference, and
 * — when following the system — reacts to OS light/dark changes live.
 */
export function useApplyTheme(): void {
  const pref = useAppStore((s) => s.themePref);

  useEffect(() => {
    const mql = window.matchMedia?.('(prefers-color-scheme: dark)');

    const apply = () => {
      const resolved = resolveTheme(pref, mql?.matches ?? false);
      document.documentElement.classList.toggle('dark', resolved === 'dark');
    };

    apply();
    saveThemePref(window.localStorage, pref);

    if (pref === 'system' && mql) {
      mql.addEventListener('change', apply);
      return () => mql.removeEventListener('change', apply);
    }
    return undefined;
  }, [pref]);
}
