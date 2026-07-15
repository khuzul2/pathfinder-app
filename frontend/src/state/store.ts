import { create } from 'zustand';
import type { RadarFrame } from '../lib/radar';
import type { ThemePref } from '../lib/theme';
import type { Waypoint } from '../lib/geo';
import type { RouteAnalysis } from '../lib/route';
import type { Poi, Bbox, PoiKind } from '../lib/poiApi';
import type { SlicePlan } from '../lib/slicing';
import { SLICING } from '../lib/constants';
import { makeSavedRoute, defaultRouteName, type SavedRoute } from '../lib/savedRoute';
import { DEFAULT_ROUTING_OPTIONS, type RoutingOptions } from '../lib/routingOptions';
import { localRouteStorage } from '../services/routeStorage';
import type { CommunityHike } from '../services/waymarkedTrails';

export type { Waypoint };

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

  // Routing (Phase 3, named stops Phase 8)
  waypoints: Waypoint[];
  addWaypoint: (point: Waypoint) => void;
  /** Replace the whole stop list at once (e.g. auto-inserting overnight stops). */
  setWaypoints: (points: Waypoint[]) => void;
  insertWaypoint: (index: number, point: Waypoint) => void;
  updateWaypoint: (index: number, point: Waypoint) => void;
  removeWaypoint: (index: number) => void;
  moveWaypoint: (from: number, to: number) => void;
  reverseWaypoints: () => void;
  clearWaypoints: () => void;

  route: RouteAnalysis | null;
  setRoute: (route: RouteAnalysis | null) => void;

  /** Bumped to ask the map to (re)frame the current stops (center one, fit-bounds many). */
  mapFocusNonce: number;
  requestMapFocus: () => void;

  /** Route options (recommended + alternatives, Phase 8); `route` mirrors the selected one. */
  alternatives: RouteAnalysis[];
  selectedRouteIndex: number;
  setAlternatives: (routes: RouteAnalysis[]) => void;
  selectRoute: (index: number) => void;

  routeError: string | null;
  setRouteError: (message: string | null) => void;

  /** True while a route request is in flight (drives the "Routing…" indicator). */
  routing: boolean;
  setRouting: (routing: boolean) => void;

  /** Elevation-chart ↔ map hover-sync: index into route.points (null = no hover). */
  hoverIndex: number | null;
  setHoverIndex: (index: number | null) => void;

  // Map layers (Phase 6)
  trailsOverlay: boolean;
  toggleTrailsOverlay: () => void;

  // Community hikes overlay (Phase 10) — named long routes drawn as an interactive vector layer.
  communityHikesEnabled: boolean;
  toggleCommunityHikes: () => void;
  communityHikes: CommunityHike[];
  setCommunityHikes: (hikes: CommunityHike[]) => void;

  // Routing options (Phase 8)
  routingOptions: RoutingOptions;
  setRoutingOptions: (patch: Partial<RoutingOptions>) => void;

  // POI + multi-day slicing (Phase 4)
  pois: Poi[];
  setPois: (pois: Poi[]) => void;
  /** Overnight-capable POIs along the whole route corridor (drives the day planner, viewport-independent). */
  routeShelters: Poi[];
  setRouteShelters: (pois: Poi[]) => void;
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

  // Saved routes (Phase 9) — the working route autosaves into this list (localStorage today,
  // a per-user cloud DB once auth lands).
  savedRoutes: SavedRoute[];
  currentRouteId: string | null;
  hydrateRoutes: () => void;
  newRoute: () => void;
  openRoute: (id: string) => void;
  renameRoute: (id: string, name: string) => void;
  deleteRoute: (id: string) => void;
  /** Upsert the current working route (waypoints + last analysis) into the saved list. */
  persistCurrent: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
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
  setWaypoints: (points) => set({ waypoints: points }),
  insertWaypoint: (index, point) =>
    set((state) => {
      const next = [...state.waypoints];
      next.splice(Math.max(0, Math.min(index, next.length)), 0, point);
      return { waypoints: next };
    }),
  updateWaypoint: (index, point) =>
    set((state) => ({
      waypoints: state.waypoints.map((w, i) => (i === index ? point : w)),
    })),
  removeWaypoint: (index) =>
    set((state) => ({ waypoints: state.waypoints.filter((_, i) => i !== index) })),
  moveWaypoint: (from, to) =>
    set((state) => {
      if (
        from === to ||
        from < 0 ||
        to < 0 ||
        from >= state.waypoints.length ||
        to >= state.waypoints.length
      )
        return {};
      const next = [...state.waypoints];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved!);
      return { waypoints: next };
    }),
  reverseWaypoints: () => set((state) => ({ waypoints: [...state.waypoints].reverse() })),
  clearWaypoints: () =>
    set({
      waypoints: [],
      route: null,
      alternatives: [],
      selectedRouteIndex: 0,
      routeError: null,
      hoverIndex: null,
      slicePlan: null,
      forcedStopIds: [],
    }),

  route: null,
  setRoute: (route) => set({ route }),

  mapFocusNonce: 0,
  requestMapFocus: () => set((state) => ({ mapFocusNonce: state.mapFocusNonce + 1 })),

  alternatives: [],
  selectedRouteIndex: 0,
  setAlternatives: (routes) =>
    set({ alternatives: routes, route: routes[0] ?? null, selectedRouteIndex: 0 }),
  selectRoute: (index) =>
    set((state) => {
      const chosen = state.alternatives[index];
      return chosen ? { route: chosen, selectedRouteIndex: index } : {};
    }),

  routeError: null,
  setRouteError: (message) => set({ routeError: message }),

  routing: false,
  setRouting: (routing) => set({ routing }),

  hoverIndex: null,
  setHoverIndex: (index) => set({ hoverIndex: index }),

  trailsOverlay: false,
  toggleTrailsOverlay: () => set((state) => ({ trailsOverlay: !state.trailsOverlay })),

  communityHikesEnabled: false,
  toggleCommunityHikes: () =>
    set((state) => ({ communityHikesEnabled: !state.communityHikesEnabled })),
  communityHikes: [],
  setCommunityHikes: (communityHikes) => set({ communityHikes }),

  routingOptions: DEFAULT_ROUTING_OPTIONS,
  setRoutingOptions: (patch) =>
    set((state) => ({ routingOptions: { ...state.routingOptions, ...patch } })),

  pois: [],
  setPois: (pois) => set({ pois }),
  routeShelters: [],
  setRouteShelters: (routeShelters) => set({ routeShelters }),
  // The three core categories show by default; the rest are opt-in via the layer toggles so the
  // map isn't flooded (peaks especially are dense in the Alps).
  poiFilters: {
    alpine_hut: true,
    camp_site: true,
    hotel: false,
    guesthouse: false,
    spring: true,
    peak: false,
    viewpoint: false,
    waterfall: false,
  },
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

  savedRoutes: [],
  currentRouteId: null,

  hydrateRoutes: () => set({ savedRoutes: localRouteStorage.load() }),

  newRoute: () =>
    set({
      waypoints: [],
      route: null,
      alternatives: [],
      selectedRouteIndex: 0,
      routeError: null,
      hoverIndex: null,
      slicePlan: null,
      forcedStopIds: [],
      currentRouteId: null,
    }),

  openRoute: (id) => {
    const state = get();
    const saved = state.savedRoutes.find((r) => r.id === id);
    if (!saved) return;
    const alternatives =
      saved.alternatives && saved.alternatives.length > 0
        ? saved.alternatives
        : saved.route
          ? [saved.route]
          : [];
    const selectedRouteIndex =
      saved.selectedRouteIndex != null && saved.selectedRouteIndex < alternatives.length
        ? saved.selectedRouteIndex
        : 0;
    set({
      waypoints: saved.waypoints,
      route: alternatives[selectedRouteIndex] ?? saved.route ?? null,
      alternatives,
      selectedRouteIndex,
      routeError: null,
      hoverIndex: null,
      slicePlan: null,
      forcedStopIds: [],
      currentRouteId: id,
      mapFocusNonce: state.mapFocusNonce + 1, // re-frame the map to the loaded route
    });
  },

  renameRoute: (id, name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const savedRoutes = get().savedRoutes.map((r) => (r.id === id ? { ...r, name: trimmed } : r));
    set({ savedRoutes });
    localRouteStorage.save(savedRoutes);
  },

  deleteRoute: (id) => {
    const savedRoutes = get().savedRoutes.filter((r) => r.id !== id);
    set({ savedRoutes });
    localRouteStorage.save(savedRoutes);
    if (get().currentRouteId === id) get().newRoute();
  },

  persistCurrent: () => {
    const state = get();
    if (state.waypoints.length === 0) return;
    const id = state.currentRouteId ?? crypto.randomUUID();
    const existing = state.savedRoutes.find((r) => r.id === id);
    const saved = makeSavedRoute({
      id,
      name: existing?.name ?? defaultRouteName(state.waypoints),
      waypoints: state.waypoints,
      route: state.route,
      alternatives: state.alternatives,
      selectedRouteIndex: state.selectedRouteIndex,
      now: Date.now(),
    });
    const savedRoutes = existing
      ? state.savedRoutes.map((r) => (r.id === id ? saved : r))
      : [saved, ...state.savedRoutes];
    set({ savedRoutes, currentRouteId: id });
    localRouteStorage.save(savedRoutes);
  },
}));
