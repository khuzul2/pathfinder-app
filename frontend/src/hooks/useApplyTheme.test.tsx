// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { useApplyTheme } from './useApplyTheme';
import { useAppStore } from '../state/store';
import { THEME_STORAGE_KEY } from '../lib/theme';

const initial = useAppStore.getState();

function Harness() {
  useApplyTheme();
  return null;
}

describe('useApplyTheme', () => {
  beforeEach(() => {
    useAppStore.setState(initial, true);
    document.documentElement.classList.remove('dark');
    window.localStorage.clear();
  });
  afterEach(() => {
    document.documentElement.classList.remove('dark');
  });

  it('adds the dark class and persists when the preference is dark', () => {
    useAppStore.setState({ themePref: 'dark' });
    render(<Harness />);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('removes the dark class when the preference is light', () => {
    document.documentElement.classList.add('dark');
    useAppStore.setState({ themePref: 'light' });
    render(<Harness />);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  });
});
