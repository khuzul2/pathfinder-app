import { useEffect, useRef } from 'react';
import type { Map as MapboxMap } from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useAppStore } from '../state/store';
import { MAP_STYLE, DEFAULT_CENTER, DEFAULT_ZOOM } from '../lib/mapConfig';
import { buildRadarTileUrl, RADAR_MAX_ZOOM } from '../lib/radar';

const RADAR_SOURCE = 'rainviewer-radar';
const RADAR_LAYER = 'rainviewer-radar-layer';

/**
 * The Mapbox GL canvas. mapbox-gl (~800 KB) is lazy-imported inside the effect so it stays
 * out of the initial bundle — and out of jsdom component tests, which have no token and no
 * WebGL. The imperative map wiring here is covered by manual QA (needs a real pk. token),
 * while the pure radar/URL logic it uses is unit-tested in `lib/radar.ts`.
 */
export function MapCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapboxMap | null>(null);

  useEffect(() => {
    const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
    const container = containerRef.current;
    if (!token || !container) return;

    let cancelled = false;
    void (async () => {
      try {
        const mapboxgl = (await import('mapbox-gl')).default;
        if (cancelled) return;
        mapboxgl.accessToken = token;
        mapRef.current = new mapboxgl.Map({
          container,
          style: MAP_STYLE,
          center: [DEFAULT_CENTER[0], DEFAULT_CENTER[1]],
          zoom: DEFAULT_ZOOM,
        });
      } catch (err) {
        console.error('Map initialization failed', err);
      }
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  const radarEnabled = useAppStore((s) => s.radarEnabled);
  const radarHost = useAppStore((s) => s.radarHost);
  const radarFrames = useAppStore((s) => s.radarFrames);
  const activeFrameIndex = useAppStore((s) => s.activeFrameIndex);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const applyRadar = () => {
      if (map.getLayer(RADAR_LAYER)) map.removeLayer(RADAR_LAYER);
      if (map.getSource(RADAR_SOURCE)) map.removeSource(RADAR_SOURCE);
      const frame = radarFrames[activeFrameIndex];
      if (!radarEnabled || !radarHost || !frame) return;
      map.addSource(RADAR_SOURCE, {
        type: 'raster',
        tiles: [buildRadarTileUrl(radarHost, frame.path)],
        tileSize: 256,
        maxzoom: RADAR_MAX_ZOOM,
        attribution: 'Radar © RainViewer',
      });
      map.addLayer({
        id: RADAR_LAYER,
        type: 'raster',
        source: RADAR_SOURCE,
        paint: { 'raster-opacity': 0.7 },
      });
    };

    if (map.isStyleLoaded()) applyRadar();
    else map.once('load', applyRadar);
  }, [radarEnabled, radarHost, radarFrames, activeFrameIndex]);

  return <div ref={containerRef} data-testid="map-canvas" className="absolute inset-0" />;
}
