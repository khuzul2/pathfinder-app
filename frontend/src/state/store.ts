import { create } from 'zustand';
import type { RadarFrame } from '../lib/radar';
import type { ThemePref } from '../lib/theme';
import type { LngLat } from '../lib/geo';
import type { RouteAnalysis } from '../lib/route';

/**
 * Global UI state (Zustand). Shared, hover-syncable, and cheaply testable.
 */
export interface AppState {
  themePref: ThemePref;
  setThemePref: (pref: ThemePref) => void;

  radarEnabled: boolean;
  toggleRadar: () => void;

  radarHost: string | null;
  radarFrames: RadarFrame[];
  activeFrameIndex: number;
  setRadar: (host: string, frames: RadarFrame[]) => void;

  // Routing (Phase 3)
  waypoints: LngLat[];
  addWaypoint: (point: LngLat) => void;
  updateWaypoint: (index: number, point: LngLat) => void;
  clearWaypoints: () => void;

  route: RouteAnalysis | null;
  setRoute: (route: RouteAnalysis | null) => void;

  routeError: string | null;
  setRouteError: (message: string | null) => void;

  /** Elevation-chart ↔ map hover-sync: index into route.points (null = no hover). */
  hoverIndex: number | null;
  setHoverIndex: (index: number | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  themePref: 'system',
  setThemePref: (pref) => set({ themePref: pref }),

  radarEnabled: false,
  toggleRadar: () => set((state) => ({ radarEnabled: !state.radarEnabled })),

  radarHost: null,
  radarFrames: [],
  activeFrameIndex: 0,
  setRadar: (host, frames) =>
    set({
      radarHost: host,
      radarFrames: frames,
      activeFrameIndex: frames.length > 0 ? frames.length - 1 : 0,
    }),

  waypoints: [],
  addWaypoint: (point) => set((state) => ({ waypoints: [...state.waypoints, point] })),
  updateWaypoint: (index, point) =>
    set((state) => ({
      waypoints: state.waypoints.map((w, i) => (i === index ? point : w)),
    })),
  clearWaypoints: () => set({ waypoints: [], route: null, routeError: null, hoverIndex: null }),

  route: null,
  setRoute: (route) => set({ route }),

  routeError: null,
  setRouteError: (message) => set({ routeError: message }),

  hoverIndex: null,
  setHoverIndex: (index) => set({ hoverIndex: index }),
}));
