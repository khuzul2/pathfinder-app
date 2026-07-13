import { useEffect, useRef } from 'react';
import type { Map as MapboxMap, Marker, MapOptions, MarkerOptions, GeoJSONSource } from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useAppStore } from '../state/store';
import { MAP_STYLE, DEFAULT_CENTER, DEFAULT_ZOOM } from '../lib/mapConfig';
import { buildRadarTileUrl, RADAR_MAX_ZOOM } from '../lib/radar';

/** The subset of the lazy-loaded mapbox-gl default export we use. */
interface MapboxApi {
  accessToken: string | null | undefined;
  Map: new (options: MapOptions) => MapboxMap;
  Marker: new (options?: MarkerOptions) => Marker;
}

const RADAR_SOURCE = 'rainviewer-radar';
const RADAR_LAYER = 'rainviewer-radar-layer';
const ROUTE_SOURCE = 'route';
const ROUTE_LAYER = 'route-line';

/**
 * The Mapbox GL canvas + all imperative map wiring (waypoint markers, the snapped route
 * line, radar overlay, hover locator). mapbox-gl is lazy-imported so it stays out of the
 * initial bundle and out of jsdom tests (no token → the map never initializes). This
 * imperative layer is verified by manual QA; the pure logic it calls (`lib/*`) is unit-tested.
 */
export function MapCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const mapboxRef = useRef<MapboxApi | null>(null);
  const readyRef = useRef(false);
  const markersRef = useRef<Marker[]>([]);
  const poiMarkersRef = useRef<Marker[]>([]);
  const hoverMarkerRef = useRef<Marker | null>(null);

  const waypoints = useAppStore((s) => s.waypoints);
  const route = useAppStore((s) => s.route);
  const pois = useAppStore((s) => s.pois);
  const forcedStopIds = useAppStore((s) => s.forcedStopIds);
  const hoverIndex = useAppStore((s) => s.hoverIndex);
  const radarEnabled = useAppStore((s) => s.radarEnabled);
  const radarHost = useAppStore((s) => s.radarHost);
  const radarFrames = useAppStore((s) => s.radarFrames);
  const activeFrameIndex = useAppStore((s) => s.activeFrameIndex);

  // --- init the map once ---
  useEffect(() => {
    const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
    const container = containerRef.current;
    if (!token || !container) return;

    let cancelled = false;
    void (async () => {
      try {
        const mapboxgl = (await import('mapbox-gl')).default;
        if (cancelled) return;
        mapboxRef.current = mapboxgl;
        mapboxgl.accessToken = token;
        const map = new mapboxgl.Map({
          container,
          style: MAP_STYLE,
          center: [DEFAULT_CENTER[0], DEFAULT_CENTER[1]],
          zoom: DEFAULT_ZOOM,
        });
        mapRef.current = map;
        map.on('load', () => {
          readyRef.current = true;
        });
        map.on('click', (e) => {
          useAppStore.getState().addWaypoint({ lng: e.lngLat.lng, lat: e.lngLat.lat });
        });
        map.on('moveend', () => {
          const b = map.getBounds();
          if (!b) return;
          useAppStore
            .getState()
            .setViewport(
              { south: b.getSouth(), west: b.getWest(), north: b.getNorth(), east: b.getEast() },
              map.getZoom(),
            );
        });
      } catch (err) {
        console.error('Map initialization failed', err);
      }
    })();

    return () => {
      cancelled = true;
      readyRef.current = false;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // --- waypoint markers (draggable) ---
  useEffect(() => {
    const map = mapRef.current;
    const mapboxgl = mapboxRef.current;
    if (!map || !mapboxgl) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = waypoints.map((wp, index) => {
      const marker = new mapboxgl.Marker({ color: '#4285F4', draggable: true })
        .setLngLat([wp.lng, wp.lat])
        .addTo(map);
      marker.on('dragend', () => {
        const { lng, lat } = marker.getLngLat();
        useAppStore.getState().updateWaypoint(index, { lng, lat });
      });
      return marker;
    });

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
    };
  }, [waypoints]);

  // --- snapped route line ---
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const draw = () => {
      const coords = route?.points.map((p) => [p.lng, p.lat]) ?? [];
      const data = {
        type: 'Feature' as const,
        properties: {},
        geometry: { type: 'LineString' as const, coordinates: coords },
      };
      const existing = map.getSource(ROUTE_SOURCE) as GeoJSONSource | undefined;
      if (existing) {
        existing.setData(data);
        return;
      }
      if (coords.length === 0) return;
      map.addSource(ROUTE_SOURCE, { type: 'geojson', data });
      map.addLayer({
        id: ROUTE_LAYER,
        type: 'line',
        source: ROUTE_SOURCE,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#0F9D58', 'line-width': 4 },
      });
    };

    if (map.isStyleLoaded()) draw();
    else map.once('load', draw);
  }, [route]);

  // --- radar overlay ---
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

  // --- POI markers (huts/campsites clickable to pin as a nightover stop) ---
  useEffect(() => {
    const map = mapRef.current;
    const mapboxgl = mapboxRef.current;
    if (!map || !mapboxgl) return;

    const colors: Record<string, string> = {
      alpine_hut: '#0F9D58',
      camp_site: '#4285F4',
      spring: '#00A3BF',
    };

    poiMarkersRef.current.forEach((m) => m.remove());
    poiMarkersRef.current = pois.map((poi) => {
      const pinned = forcedStopIds.includes(poi.id);
      const marker = new mapboxgl.Marker({
        color: colors[poi.kind] ?? '#3C4043',
        scale: pinned ? 1.1 : 0.7,
      })
        .setLngLat([poi.lng, poi.lat])
        .addTo(map);
      if (poi.kind !== 'spring') {
        const el = marker.getElement();
        el.style.cursor = 'pointer';
        el.title = poi.name ?? 'Shelter';
        el.addEventListener('click', (ev) => {
          ev.stopPropagation();
          useAppStore.getState().toggleForcedStop(poi.id);
        });
      }
      return marker;
    });

    return () => {
      poiMarkersRef.current.forEach((m) => m.remove());
      poiMarkersRef.current = [];
    };
  }, [pois, forcedStopIds]);

  // --- hover locator dot (chart ↔ map sync) ---
  useEffect(() => {
    const map = mapRef.current;
    const mapboxgl = mapboxRef.current;
    if (!map || !mapboxgl) return;

    const point = hoverIndex != null ? route?.points[hoverIndex] : undefined;
    if (!point) {
      hoverMarkerRef.current?.remove();
      hoverMarkerRef.current = null;
      return;
    }
    if (!hoverMarkerRef.current) {
      hoverMarkerRef.current = new mapboxgl.Marker({ color: '#EA4335' });
    }
    hoverMarkerRef.current.setLngLat([point.lng, point.lat]).addTo(map);
  }, [hoverIndex, route]);

  return <div ref={containerRef} data-testid="map-canvas" className="absolute inset-0" />;
}
