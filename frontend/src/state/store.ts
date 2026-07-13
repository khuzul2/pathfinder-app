import { create } from 'zustand';
import type { RadarFrame } from '../lib/radar';
import type { ThemePref } from '../lib/theme';

/**
 * Global UI state (Zustand). Shared, hover-syncable, and cheaply testable. Route/elevation
 * state joins here in Phase 3.
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
}));
