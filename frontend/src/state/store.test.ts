import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from './store';

const initial = useAppStore.getState();

describe('useAppStore', () => {
  beforeEach(() => {
    useAppStore.setState(initial, true);
  });

  it('starts with radar off and the system theme', () => {
    const s = useAppStore.getState();
    expect(s.radarEnabled).toBe(false);
    expect(s.themePref).toBe('system');
  });

  it('toggleRadar flips the flag', () => {
    useAppStore.getState().toggleRadar();
    expect(useAppStore.getState().radarEnabled).toBe(true);
    useAppStore.getState().toggleRadar();
    expect(useAppStore.getState().radarEnabled).toBe(false);
  });

  it('setThemePref updates the preference', () => {
    useAppStore.getState().setThemePref('dark');
    expect(useAppStore.getState().themePref).toBe('dark');
  });

  it('setRadar stores frames and points activeFrameIndex at the latest frame', () => {
    useAppStore.getState().setRadar('https://h', [
      { time: 1, path: '/a' },
      { time: 2, path: '/b' },
      { time: 3, path: '/c' },
    ]);
    const s = useAppStore.getState();
    expect(s.radarHost).toBe('https://h');
    expect(s.radarFrames).toHaveLength(3);
    expect(s.activeFrameIndex).toBe(2);
  });

  it('setRadar with no frames keeps activeFrameIndex at 0', () => {
    useAppStore.getState().setRadar('https://h', []);
    expect(useAppStore.getState().activeFrameIndex).toBe(0);
  });
});
