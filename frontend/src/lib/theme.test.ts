import { describe, it, expect } from 'vitest';
import {
  resolveTheme,
  loadThemePref,
  saveThemePref,
  nextThemePref,
  isThemePref,
  THEME_STORAGE_KEY,
} from './theme';

function fakeStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    map,
  };
}

describe('resolveTheme', () => {
  it('honors explicit light/dark', () => {
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });
  it('follows the system preference when set to system', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
  });
});

describe('isThemePref', () => {
  it('accepts valid values and rejects junk', () => {
    expect(isThemePref('dark')).toBe(true);
    expect(isThemePref('nope')).toBe(false);
    expect(isThemePref(null)).toBe(false);
  });
});

describe('load/saveThemePref', () => {
  it('defaults to system for missing/invalid values', () => {
    expect(loadThemePref(fakeStorage())).toBe('system');
    expect(loadThemePref(fakeStorage({ [THEME_STORAGE_KEY]: 'weird' }))).toBe('system');
  });
  it('round-trips a saved preference', () => {
    const storage = fakeStorage();
    saveThemePref(storage, 'dark');
    expect(storage.map.get(THEME_STORAGE_KEY)).toBe('dark');
    expect(loadThemePref(storage)).toBe('dark');
  });
});

describe('nextThemePref', () => {
  it('cycles system → light → dark → system', () => {
    expect(nextThemePref('system')).toBe('light');
    expect(nextThemePref('light')).toBe('dark');
    expect(nextThemePref('dark')).toBe('system');
  });
});
