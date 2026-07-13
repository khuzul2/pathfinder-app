import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from './store';

const initial = useAppStore.getState();

describe('useAppStore', () => {
  beforeEach(() => {
    useAppStore.setState(initial, true);
  });

  it('starts with radar off, system theme, and no route', () => {
    const s = useAppStore.getState();
    expect(s.radarEnabled).toBe(false);
    expect(s.themePref).toBe('system');
    expect(s.waypoints).toEqual([]);
    expect(s.route).toBeNull();
  });

  it('toggleRadar flips the flag', () => {
    useAppStore.getState().toggleRadar();
    expect(useAppStore.getState().radarEnabled).toBe(true);
  });

  it('setRadar stores frames and points activeFrameIndex at the latest', () => {
    useAppStore.getState().setRadar('https://h', [
      { time: 1, path: '/a' },
      { time: 2, path: '/b' },
    ]);
    expect(useAppStore.getState().activeFrameIndex).toBe(1);
  });

  it('addWaypoint appends; clearWaypoints resets route state', () => {
    const s = useAppStore.getState();
    s.addWaypoint({ lng: 11, lat: 48 });
    s.addWaypoint({ lng: 12, lat: 49 });
    expect(useAppStore.getState().waypoints).toHaveLength(2);

    useAppStore.getState().setRouteError('boom');
    useAppStore.getState().clearWaypoints();
    const after = useAppStore.getState();
    expect(after.waypoints).toEqual([]);
    expect(after.route).toBeNull();
    expect(after.routeError).toBeNull();
  });

  it('setHoverIndex updates the hover-sync index', () => {
    useAppStore.getState().setHoverIndex(7);
    expect(useAppStore.getState().hoverIndex).toBe(7);
  });
});
