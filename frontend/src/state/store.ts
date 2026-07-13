import { create } from 'zustand';
import type { RadarFrame } from '../lib/radar';
import type { ThemePref } from '../lib/theme';
import type { LngLat } from '../lib/geo';
import type { RouteAnalysis } from '../lib/route';
import type { Poi, Bbox, PoiKind } from '../lib/poiApi';
import type { SlicePlan } from '../lib/slicing';
import { SLICING } from '../lib/constants';

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
  removeWaypoint: (index: number) => void;
  clearWaypoints: () => void;

  route: RouteAnalysis | null;
  setRoute: (route: RouteAnalysis | null) => void;

  routeError: string | null;
  setRouteError: (message: string | null) => void;

  /** Elevation-chart ↔ map hover-sync: index into route.points (null = no hover). */
  hoverIndex: number | null;
  setHoverIndex: (index: number | null) => void;

  // Map layers (Phase 6)
  trailsOverlay: boolean;
  toggleTrailsOverlay: () => void;

  // POI + multi-day slicing (Phase 4)
  pois: Poi[];
  setPois: (pois: Poi[]) => void;
  poiFilters: Record<PoiKind, boolean>;
  togglePoiFilter: (kind: PoiKind) => void;

  viewportBbox: Bbox | null;
  viewportZoom: number;
  setViewport: (bbox: Bbox, zoom: number) => void;

  /** Target moving hours per day for the slicer. */
  targetHours: number;
  setTargetHours: (hours: number) => void;

  /** Shelters the user pinned as preferred nightover stops (empty = auto-pick from all). */
  forcedStopIds: string[];
  toggleForcedStop: (id: string) => void;

  slicePlan: SlicePlan | null;
  setSlicePlan: (plan: SlicePlan | null) => void;
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
  removeWaypoint: (index) =>
    set((state) => ({ waypoints: state.waypoints.filter((_, i) => i !== index) })),
  clearWaypoints: () =>
    set({
      waypoints: [],
      route: null,
      routeError: null,
      hoverIndex: null,
      slicePlan: null,
      forcedStopIds: [],
    }),

  route: null,
  setRoute: (route) => set({ route }),

  routeError: null,
  setRouteError: (message) => set({ routeError: message }),

  hoverIndex: null,
  setHoverIndex: (index) => set({ hoverIndex: index }),

  trailsOverlay: false,
  toggleTrailsOverlay: () => set((state) => ({ trailsOverlay: !state.trailsOverlay })),

  pois: [],
  setPois: (pois) => set({ pois }),
  poiFilters: { alpine_hut: true, camp_site: true, spring: true },
  togglePoiFilter: (kind) =>
    set((state) => ({ poiFilters: { ...state.poiFilters, [kind]: !state.poiFilters[kind] } })),

  viewportBbox: null,
  viewportZoom: 0,
  setViewport: (viewportBbox, viewportZoom) => set({ viewportBbox, viewportZoom }),

  targetHours: SLICING.targetHoursPerDay,
  setTargetHours: (targetHours) => set({ targetHours }),

  forcedStopIds: [],
  toggleForcedStop: (id) =>
    set((state) => ({
      forcedStopIds: state.forcedStopIds.includes(id)
        ? state.forcedStopIds.filter((x) => x !== id)
        : [...state.forcedStopIds, id],
    })),

  slicePlan: null,
  setSlicePlan: (slicePlan) => set({ slicePlan }),
}));
