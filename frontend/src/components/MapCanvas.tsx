import { useEffect, useRef } from 'react';
import type {
  Map as MapboxMap,
  Marker,
  Popup,
  MapOptions,
  MarkerOptions,
  PopupOptions,
  GeoJSONSource,
} from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useAppStore } from '../state/store';
import { MAP_STYLE, DEFAULT_CENTER, DEFAULT_ZOOM } from '../lib/mapConfig';
import { buildRadarTileUrl, RADAR_MAX_ZOOM } from '../lib/radar';
import { POI_META } from '../lib/poiApi';
import type { Poi } from '../lib/poiApi';
import { haversineMeters } from '../lib/geo';
import { reverseGeocode } from '../services/geocodeClient';

/** The subset of the lazy-loaded mapbox-gl default export we use. */
interface MapboxApi {
  accessToken: string | null | undefined;
  Map: new (options: MapOptions) => MapboxMap;
  Marker: new (options?: MarkerOptions) => Marker;
  Popup: new (options?: PopupOptions) => Popup;
}

const RADAR_SOURCE = 'rainviewer-radar';
const RADAR_LAYER = 'rainviewer-radar-layer';
// One source holds every route option as a feature tagged `selected`; a single data-driven layer
// paints the selected route blue-on-top and the rest grey. This can't "lose" the selection the
// way two separate layers could get out of sync.
const ROUTES_SOURCE = 'routes';
const ROUTES_LAYER = 'routes-line';
const TRAILS_SOURCE = 'waymarked-hiking';
const TRAILS_LAYER = 'waymarked-hiking-layer';

/** Waymarked Trails renders OSM hiking relations (SAC-coloured routes) as a raster overlay. */
const TRAILS_TILES = 'https://tile.waymarkedtrails.org/hiking/{z}/{x}/{y}.png';

/** Nearest POI to a point within `maxMeters`, else null (for snapping a dropped stop). */
function nearestPoi(pois: readonly Poi[], lng: number, lat: number, maxMeters: number): Poi | null {
  let best: Poi | null = null;
  let bestDist = maxMeters;
  for (const p of pois) {
    const d = haversineMeters({ lng, lat }, { lng: p.lng, lat: p.lat });
    if (d <= bestDist) {
      bestDist = d;
      best = p;
    }
  }
  return best;
}

/**
 * Add a stop at a clicked point: snap to a nearby POI (using its name) when one is within ~100 m,
 * otherwise drop the exact point and reverse-geocode a place/address name for the stops list.
 */
function addStopAt(lng: number, lat: number): void {
  const store = useAppStore.getState();
  const poi = nearestPoi(store.pois, lng, lat, 100);
  if (poi) {
    store.addWaypoint({ lng: poi.lng, lat: poi.lat, name: poi.name ?? POI_META[poi.kind].label });
    return;
  }
  const index = store.waypoints.length;
  store.addWaypoint({ lng, lat });
  void reverseGeocode(lng, lat).then((name) => {
    if (name) useAppStore.getState().updateWaypoint(index, { lng, lat, name });
  });
}

/** Re-resolve a stop's name after it is moved (POI snap or reverse-geocode) at position `index`. */
function nameStopAt(index: number, lng: number, lat: number): void {
  const store = useAppStore.getState();
  const poi = nearestPoi(store.pois, lng, lat, 100);
  if (poi) {
    store.updateWaypoint(index, {
      lng: poi.lng,
      lat: poi.lat,
      name: poi.name ?? POI_META[poi.kind].label,
    });
    return;
  }
  store.updateWaypoint(index, { lng, lat }); // drop the now-stale name; show coords until resolved
  void reverseGeocode(lng, lat).then((name) => {
    if (name) useAppStore.getState().updateWaypoint(index, { lng, lat, name });
  });
}

/** A numbered, draggable stop pin coloured by role (start green · via blue · end red). */
function buildWaypointElement(index: number, total: number, name?: string): HTMLDivElement {
  const color = index === 0 ? '#0F9D58' : index === total - 1 ? '#EA4335' : '#4285F4';
  const el = document.createElement('div');
  el.style.cssText = `display:flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:9999px;background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.4);color:#fff;font:700 13px system-ui,sans-serif;cursor:grab;`;
  el.textContent = String(index + 1);
  el.title = name ?? (index === 0 ? 'Start' : index === total - 1 ? 'End' : `Stop ${index + 1}`);
  return el;
}

/** A round emoji pin element for a POI; pinned shelters read larger with a coral ring. */
function buildPoiElement(poi: Poi, pinned: boolean): HTMLDivElement {
  const meta = POI_META[poi.kind];
  const size = pinned ? 30 : 24;
  const el = document.createElement('div');
  el.style.cssText = `display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;border-radius:9999px;background:${meta.color};border:2px solid ${
    pinned ? '#EA4335' : 'rgba(255,255,255,0.85)'
  };box-shadow:0 1px 4px rgba(0,0,0,0.35);font-size:${pinned ? 15 : 12}px;cursor:pointer;`;
  el.textContent = meta.icon;
  el.title = poi.name ?? meta.label;
  return el;
}

/** Popup DOM: name + category, plus a pin/unpin overnight-stop action for shelters. */
function buildPoiPopup(poi: Poi, pinned: boolean): HTMLDivElement {
  const meta = POI_META[poi.kind];
  const wrap = document.createElement('div');
  wrap.style.cssText = 'font:13px system-ui,sans-serif;min-width:150px;color:#202124;';

  const title = document.createElement('div');
  title.style.cssText = 'font-weight:600;';
  title.textContent = `${meta.icon} ${poi.name ?? meta.label}`;

  const sub = document.createElement('div');
  sub.style.cssText = 'opacity:0.6;margin-top:2px;';
  sub.textContent = meta.label;
  wrap.append(title, sub);

  if (poi.kind !== 'spring') {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = pinned ? 'Unpin overnight stop' : 'Pin as overnight stop';
    btn.style.cssText = `margin-top:8px;width:100%;border-radius:6px;border:1px solid ${meta.color};background:${
      pinned ? meta.color : '#fff'
    };color:${pinned ? '#fff' : meta.color};padding:4px 8px;font:600 12px system-ui,sans-serif;cursor:pointer;`;
    btn.addEventListener('click', () => {
      useAppStore.getState().toggleForcedStop(poi.id);
    });
    wrap.append(btn);
  }
  return wrap;
}

/**
 * The Mapbox GL canvas + all imperative map wiring (waypoint markers, the snapped route
 * line, trail overlay, POI pins, radar overlay, hover locator). mapbox-gl is lazy-imported so
 * it stays out of the initial bundle and out of jsdom tests (no token → the map never
 * initializes). This imperative layer is verified by manual QA; the pure logic it calls
 * (`lib/*`) is unit-tested.
 */
export function MapCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const mapboxRef = useRef<MapboxApi | null>(null);
  const readyRef = useRef(false);
  const hoveredAltRef = useRef<number | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const poiMarkersRef = useRef<Marker[]>([]);
  const poiPopupRef = useRef<Popup | null>(null);
  const hoverMarkerRef = useRef<Marker | null>(null);

  const waypoints = useAppStore((s) => s.waypoints);
  const route = useAppStore((s) => s.route);
  const alternatives = useAppStore((s) => s.alternatives);
  const selectedRouteIndex = useAppStore((s) => s.selectedRouteIndex);
  const mapFocusNonce = useAppStore((s) => s.mapFocusNonce);
  const pois = useAppStore((s) => s.pois);
  const poiFilters = useAppStore((s) => s.poiFilters);
  const forcedStopIds = useAppStore((s) => s.forcedStopIds);
  const hoverIndex = useAppStore((s) => s.hoverIndex);
  const trailsOverlay = useAppStore((s) => s.trailsOverlay);
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
        // Double-click adds a stop (single click is reserved for selecting an alternative), so
        // disable the default double-click-to-zoom.
        map.doubleClickZoom.disable();
        map.on('click', (e) => {
          if (!map.getLayer(ROUTES_LAYER)) return;
          const hit = map.queryRenderedFeatures(e.point, { layers: [ROUTES_LAYER] })[0];
          if (hit && typeof hit.id === 'number') useAppStore.getState().selectRoute(hit.id);
        });
        map.on('dblclick', (e) => addStopAt(e.lngLat.lng, e.lngLat.lat));
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
      const el = buildWaypointElement(index, waypoints.length, wp.name);
      const marker = new mapboxgl.Marker({ element: el, draggable: true })
        .setLngLat([wp.lng, wp.lat])
        .addTo(map);
      marker.on('dragend', () => {
        const { lng, lat } = marker.getLngLat();
        // Re-resolve the stop's name for its new position (the route re-snaps to trails too).
        nameStopAt(index, lng, lat);
      });
      return marker;
    });

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
    };
  }, [waypoints]);

  // --- re-frame the map to the current stops (center one, fit-bounds many) ---
  useEffect(() => {
    const map = mapRef.current;
    if (!map || mapFocusNonce === 0) return;
    const stops = useAppStore.getState().waypoints;
    if (stops.length === 0) return;
    if (stops.length === 1) {
      const only = stops[0]!;
      map.flyTo({ center: [only.lng, only.lat], zoom: Math.max(map.getZoom(), 12), duration: 800 });
      return;
    }
    const lngs = stops.map((s) => s.lng);
    const lats = stops.map((s) => s.lat);
    map.fitBounds(
      [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ],
      { padding: 80, maxZoom: 14, duration: 800 },
    );
  }, [mapFocusNonce]);

  // --- Waymarked Trails hiking overlay (toggleable) ---
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const apply = () => {
      const hasLayer = map.getLayer(TRAILS_LAYER);
      if (!trailsOverlay) {
        if (hasLayer) map.removeLayer(TRAILS_LAYER);
        if (map.getSource(TRAILS_SOURCE)) map.removeSource(TRAILS_SOURCE);
        return;
      }
      if (hasLayer) return;
      if (!map.getSource(TRAILS_SOURCE)) {
        map.addSource(TRAILS_SOURCE, {
          type: 'raster',
          tiles: [TRAILS_TILES],
          tileSize: 256,
          attribution: 'Trails © waymarkedtrails.org',
        });
      }
      // Keep the routes drawn on top of the overlay when both are present.
      const beforeId = map.getLayer(ROUTES_LAYER) ? ROUTES_LAYER : undefined;
      map.addLayer(
        {
          id: TRAILS_LAYER,
          type: 'raster',
          source: TRAILS_SOURCE,
          paint: { 'raster-opacity': 0.85 },
        },
        beforeId,
      );
    };

    if (map.isStyleLoaded()) apply();
    else map.once('load', apply);
  }, [trailsOverlay]);

  // --- all route options in one layer (selected = blue on top, others = grey) ---
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const draw = () => {
      // Every option is one feature (id = its index). `selected` drives the data-driven paint and
      // draw order, so selecting simply re-paints — the selected route can never vanish.
      const features = alternatives
        .map((r, i) => ({ r, i }))
        .filter(({ r }) => r.points.length >= 2)
        .map(({ r, i }) => ({
          type: 'Feature' as const,
          id: i,
          properties: { index: i, selected: i === selectedRouteIndex },
          geometry: {
            type: 'LineString' as const,
            coordinates: r.points.map((p) => [p.lng, p.lat] as [number, number]),
          },
        }));
      const data = { type: 'FeatureCollection' as const, features };
      const existing = map.getSource(ROUTES_SOURCE) as GeoJSONSource | undefined;
      if (existing) {
        existing.setData(data);
        return;
      }
      if (features.length === 0) return;
      map.addSource(ROUTES_SOURCE, { type: 'geojson', data });
      map.addLayer({
        id: ROUTES_LAYER,
        type: 'line',
        source: ROUTES_SOURCE,
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
          'line-sort-key': ['case', ['get', 'selected'], 1, 0], // selected drawn last (on top)
        },
        paint: {
          'line-color': ['case', ['get', 'selected'], '#1A73E8', '#5F6368'],
          'line-width': [
            'case',
            ['get', 'selected'],
            6,
            ['case', ['boolean', ['feature-state', 'hover'], false], 6, 4],
          ],
          'line-opacity': [
            'case',
            ['get', 'selected'],
            1,
            ['case', ['boolean', ['feature-state', 'hover'], false], 0.95, 0.65],
          ],
        },
      });

      // Hover feedback for the (grey) alternatives — pointer cursor + a width/opacity bump.
      map.on('mousemove', ROUTES_LAYER, (e) => {
        map.getCanvas().style.cursor = 'pointer';
        const id = e.features?.[0]?.id;
        if (typeof id !== 'number') return;
        if (hoveredAltRef.current !== null && hoveredAltRef.current !== id) {
          map.setFeatureState(
            { source: ROUTES_SOURCE, id: hoveredAltRef.current },
            { hover: false },
          );
        }
        hoveredAltRef.current = id;
        map.setFeatureState({ source: ROUTES_SOURCE, id }, { hover: true });
      });
      map.on('mouseleave', ROUTES_LAYER, () => {
        map.getCanvas().style.cursor = '';
        if (hoveredAltRef.current !== null) {
          map.setFeatureState(
            { source: ROUTES_SOURCE, id: hoveredAltRef.current },
            { hover: false },
          );
          hoveredAltRef.current = null;
        }
      });
    };

    if (map.isStyleLoaded()) draw();
    else map.once('load', draw);
  }, [alternatives, selectedRouteIndex]);

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

  // --- POI markers (emoji pins; filtered by category; click for details/pin-as-stop) ---
  useEffect(() => {
    const map = mapRef.current;
    const mapboxgl = mapboxRef.current;
    if (!map || !mapboxgl) return;

    const visible = pois.filter((poi) => poiFilters[poi.kind]);
    poiMarkersRef.current.forEach((m) => m.remove());
    poiMarkersRef.current = visible.map((poi) => {
      const pinned = forcedStopIds.includes(poi.id);
      const el = buildPoiElement(poi, pinned);
      const marker = new mapboxgl.Marker({ element: el }).setLngLat([poi.lng, poi.lat]).addTo(map);
      el.addEventListener('click', (ev) => {
        ev.stopPropagation();
        poiPopupRef.current?.remove();
        poiPopupRef.current = new mapboxgl.Popup({ offset: 18, closeButton: true })
          .setLngLat([poi.lng, poi.lat])
          .setDOMContent(buildPoiPopup(poi, pinned))
          .addTo(map);
      });
      return marker;
    });

    return () => {
      poiPopupRef.current?.remove();
      poiPopupRef.current = null;
      poiMarkersRef.current.forEach((m) => m.remove());
      poiMarkersRef.current = [];
    };
  }, [pois, poiFilters, forcedStopIds]);

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
