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
import { segmentForHover } from '../lib/routeInsert';
import { sampleWaypoints, TRAIL_IMPORT_STOPS } from '../lib/trailGeometry';
import { importHikeRoute } from '../services/trailImport';
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
// Highlight of the hovered leg + a "+" handle for inserting a via-stop between two existing stops.
const INSERT_SOURCE = 'insert-hint';
const INSERT_LAYER = 'insert-hint-line';
const TRAILS_SOURCE = 'waymarked-hiking';
const TRAILS_LAYER = 'waymarked-hiking-layer';
// Named community/long-distance hikes as an interactive vector layer (hover to highlight, click to
// adopt) — distinct from the raster marked-paths overlay above.
const COMMUNITY_SOURCE = 'community-hikes';
const COMMUNITY_LAYER = 'community-hikes-line';

/** Waymarked Trails renders OSM hiking relations (SAC-coloured routes) as a raster overlay. */
const TRAILS_TILES = 'https://tile.waymarkedtrails.org/hiking/{z}/{x}/{y}.png';

const EMPTY_FC = { type: 'FeatureCollection' as const, features: [] };

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

/** Insert a via-stop into the selected route at the hovered leg (POI snap / reverse-geocode name). */
function insertStopAt(lng: number, lat: number): void {
  const store = useAppStore.getState();
  const route = store.route;
  const seg = route ? segmentForHover(route.points, store.waypoints, { lng, lat }) : null;
  const index = seg ? seg.insertAt : store.waypoints.length;

  const poi = nearestPoi(store.pois, lng, lat, 100);
  if (poi) {
    store.insertWaypoint(index, {
      lng: poi.lng,
      lat: poi.lat,
      name: poi.name ?? POI_META[poi.kind].label,
    });
    return;
  }
  store.insertWaypoint(index, { lng, lat });
  void reverseGeocode(lng, lat).then((name) => {
    if (!name) return;
    const wps = useAppStore.getState().waypoints;
    const at = wps.findIndex((w) => w.lng === lng && w.lat === lat && !w.name);
    if (at >= 0) useAppStore.getState().updateWaypoint(at, { lng, lat, name });
  });
}

/** The small "+" handle shown on the route to insert a via-stop. */
function buildInsertHandle(): HTMLDivElement {
  const el = document.createElement('div');
  el.style.cssText =
    'display:flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:9999px;background:#fff;border:2px solid #1A73E8;color:#1A73E8;font:700 15px system-ui,sans-serif;line-height:1;box-shadow:0 1px 3px rgba(0,0,0,0.4);cursor:pointer;';
  el.textContent = '+';
  el.title = 'Click to add a stop here';
  return el;
}

/** Adopt a community hike as the current route: snap its real geometry faithfully, or fall back. */
function importHike(id: number): void {
  const store = useAppStore.getState();
  const hike = store.communityHikes.find((h) => h.id === id);
  if (!hike || hike.points.length < 2) return;
  const stops = sampleWaypoints(hike.points, TRAIL_IMPORT_STOPS, hike.name);
  store.setBusy(`Importing “${hike.name}”…`);
  void importHikeRoute(hike.points, store.routingOptions.avoidRoads)
    .then((analysis) => {
      const s = useAppStore.getState();
      if (analysis) s.setImportedRoute(analysis, stops);
      else {
        s.setWaypoints(stops);
        s.requestMapFocus();
      }
    })
    .finally(() => useAppStore.getState().setBusy(null));
}

/** Hover-tooltip DOM for a community hike: its name + the call to action. */
function buildHikeTooltip(name: string): HTMLDivElement {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'font:13px system-ui,sans-serif;color:#202124;min-width:120px;';
  const title = document.createElement('div');
  title.style.cssText = 'font-weight:600;';
  title.textContent = name;
  const hint = document.createElement('div');
  hint.style.cssText = 'opacity:0.65;margin-top:1px;font-size:11px;';
  hint.textContent = 'Click to make this your hike';
  wrap.append(title, hint);
  return wrap;
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

/** Popup DOM: name + category, an "Add as stop" action, plus pin/unpin overnight for shelters. */
function buildPoiPopup(poi: Poi, pinned: boolean, onClose: () => void): HTMLDivElement {
  const meta = POI_META[poi.kind];
  const wrap = document.createElement('div');
  wrap.style.cssText = 'font:13px system-ui,sans-serif;min-width:160px;color:#202124;';

  const title = document.createElement('div');
  title.style.cssText = 'font-weight:600;';
  title.textContent = `${meta.icon} ${poi.name ?? meta.label}`;

  const sub = document.createElement('div');
  sub.style.cssText = 'opacity:0.6;margin-top:2px;';
  sub.textContent = meta.label;
  wrap.append(title, sub);

  // Any POI can be dropped into the route as a named stop.
  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.textContent = '➕ Add as stop';
  addBtn.style.cssText =
    'margin-top:8px;width:100%;border-radius:6px;border:1px solid #1A73E8;background:#1A73E8;color:#fff;padding:5px 8px;font:600 12px system-ui,sans-serif;cursor:pointer;';
  addBtn.addEventListener('click', () => {
    useAppStore
      .getState()
      .addWaypoint({ lng: poi.lng, lat: poi.lat, name: poi.name ?? meta.label });
    onClose();
  });
  wrap.append(addBtn);

  if (poi.kind !== 'spring') {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = pinned ? 'Unpin overnight stop' : 'Pin as overnight stop';
    btn.style.cssText = `margin-top:6px;width:100%;border-radius:6px;border:1px solid ${meta.color};background:${
      pinned ? meta.color : '#fff'
    };color:${pinned ? '#fff' : meta.color};padding:4px 8px;font:600 12px system-ui,sans-serif;cursor:pointer;`;
    btn.addEventListener('click', () => {
      const store = useAppStore.getState();
      store.toggleForcedStop(poi.id);
      // Pinning a shelter also drops it into the route so the path is rebuilt through it.
      if (!pinned && !store.waypoints.some((w) => w.lng === poi.lng && w.lat === poi.lat)) {
        store.addWaypoint({ lng: poi.lng, lat: poi.lat, name: poi.name ?? meta.label });
      }
      onClose();
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
  const insertMarkerRef = useRef<Marker | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const poiMarkersRef = useRef<Marker[]>([]);
  const poiPopupRef = useRef<Popup | null>(null);
  const hoverMarkerRef = useRef<Marker | null>(null);
  const communityPopupRef = useRef<Popup | null>(null);
  const hoveredHikeRef = useRef<number | null>(null);

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
  const communityHikes = useAppStore((s) => s.communityHikes);
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

        // Empty map → center on the user's current location (prompts for permission). Denied or
        // unavailable falls back silently to the default center; a stop added meanwhile wins.
        if (useAppStore.getState().waypoints.length === 0 && 'geolocation' in navigator) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              if (cancelled || useAppStore.getState().waypoints.length > 0) return;
              map.flyTo({
                center: [pos.coords.longitude, pos.coords.latitude],
                zoom: 12,
                duration: 800,
              });
            },
            () => {}, // denied / unavailable → keep the default center
            { enableHighAccuracy: false, timeout: 8000, maximumAge: 600_000 },
          );
        }

        // Create the route + insert-hint layers and their interactions ONCE, at load, so the
        // handlers are reliably attached (rather than racing the first route render).
        map.on('load', () => {
          readyRef.current = true;

          map.addSource(ROUTES_SOURCE, { type: 'geojson', data: EMPTY_FC });
          map.addLayer({
            id: ROUTES_LAYER,
            type: 'line',
            source: ROUTES_SOURCE,
            layout: {
              'line-cap': 'round',
              'line-join': 'round',
              'line-sort-key': ['case', ['get', 'selected'], 1, 0],
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

          map.addSource(INSERT_SOURCE, { type: 'geojson', data: EMPTY_FC });
          map.addLayer({
            id: INSERT_LAYER,
            type: 'line',
            source: INSERT_SOURCE,
            layout: { 'line-cap': 'round', 'line-join': 'round' },
            paint: { 'line-color': '#F9AB00', 'line-width': 9, 'line-opacity': 0.9 },
          });

          // Community hikes: an interactive purple vector layer, drawn BELOW the routes so the
          // user's own (blue) route always stays on top. Hover highlights + tooltips; click adopts.
          map.addSource(COMMUNITY_SOURCE, { type: 'geojson', data: EMPTY_FC });
          map.addLayer(
            {
              id: COMMUNITY_LAYER,
              type: 'line',
              source: COMMUNITY_SOURCE,
              layout: { 'line-cap': 'round', 'line-join': 'round' },
              paint: {
                'line-color': '#8E24AA',
                'line-width': ['case', ['boolean', ['feature-state', 'hover'], false], 7, 4],
                'line-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 1, 0.75],
              },
            },
            ROUTES_LAYER,
          );

          map.on('mousemove', COMMUNITY_LAYER, (e) => {
            map.getCanvas().style.cursor = 'pointer';
            const id = e.features?.[0]?.id;
            if (typeof id !== 'number') return;
            if (hoveredHikeRef.current !== null && hoveredHikeRef.current !== id) {
              map.setFeatureState(
                { source: COMMUNITY_SOURCE, id: hoveredHikeRef.current },
                { hover: false },
              );
            }
            hoveredHikeRef.current = id;
            map.setFeatureState({ source: COMMUNITY_SOURCE, id }, { hover: true });
            const hike = useAppStore.getState().communityHikes.find((h) => h.id === id);
            if (hike && mapboxRef.current) {
              if (!communityPopupRef.current) {
                communityPopupRef.current = new mapboxRef.current.Popup({
                  closeButton: false,
                  closeOnClick: false,
                  offset: 12,
                });
              }
              communityPopupRef.current
                .setLngLat(e.lngLat)
                .setDOMContent(buildHikeTooltip(hike.name))
                .addTo(map);
            }
          });
          map.on('mouseleave', COMMUNITY_LAYER, () => {
            map.getCanvas().style.cursor = '';
            if (hoveredHikeRef.current !== null) {
              map.setFeatureState(
                { source: COMMUNITY_SOURCE, id: hoveredHikeRef.current },
                { hover: false },
              );
              hoveredHikeRef.current = null;
            }
            communityPopupRef.current?.remove();
          });
          map.on('click', COMMUNITY_LAYER, (e) => {
            const id = e.features?.[0]?.id;
            if (typeof id === 'number') importHike(id);
          });

          const clearInsertHint = () => {
            (map.getSource(INSERT_SOURCE) as GeoJSONSource | undefined)?.setData(EMPTY_FC);
            insertMarkerRef.current?.remove();
          };

          map.on('mousemove', ROUTES_LAYER, (e) => {
            map.getCanvas().style.cursor = 'pointer';
            const id = e.features?.[0]?.id;
            if (typeof id !== 'number') return;

            // Grey alternatives: hover highlight.
            if (hoveredAltRef.current !== null && hoveredAltRef.current !== id) {
              map.setFeatureState(
                { source: ROUTES_SOURCE, id: hoveredAltRef.current },
                { hover: false },
              );
            }
            hoveredAltRef.current = id;
            map.setFeatureState({ source: ROUTES_SOURCE, id }, { hover: true });

            // Selected route: highlight the hovered leg + show a "+" handle to insert a via-stop.
            const store = useAppStore.getState();
            if (id !== store.selectedRouteIndex || !store.route) {
              clearInsertHint();
              return;
            }
            const seg = segmentForHover(store.route.points, store.waypoints, e.lngLat);
            if (!seg) {
              clearInsertHint();
              return;
            }
            const legCoords = store.route.points
              .slice(seg.segStart, seg.segEnd + 1)
              .map((p) => [p.lng, p.lat] as [number, number]);
            (map.getSource(INSERT_SOURCE) as GeoJSONSource | undefined)?.setData({
              type: 'FeatureCollection',
              features: [
                {
                  type: 'Feature',
                  properties: {},
                  geometry: { type: 'LineString', coordinates: legCoords },
                },
              ],
            });
            if (!insertMarkerRef.current && mapboxRef.current) {
              const handle = buildInsertHandle();
              handle.addEventListener('click', (ev) => {
                ev.stopPropagation();
                const ll = insertMarkerRef.current?.getLngLat();
                if (ll) insertStopAt(ll.lng, ll.lat);
              });
              insertMarkerRef.current = new mapboxRef.current.Marker({ element: handle });
            }
            insertMarkerRef.current?.setLngLat([e.lngLat.lng, e.lngLat.lat]).addTo(map);
          });
          map.on('mouseleave', ROUTES_LAYER, () => {
            map.getCanvas().style.cursor = '';
            clearInsertHint();
            if (hoveredAltRef.current !== null) {
              map.setFeatureState(
                { source: ROUTES_SOURCE, id: hoveredAltRef.current },
                { hover: false },
              );
              hoveredAltRef.current = null;
            }
          });
        });

        // Double-click adds a stop (single click is reserved for selecting an alternative), so
        // disable the default double-click-to-zoom.
        map.doubleClickZoom.disable();
        map.on('click', (e) => {
          if (!map.getLayer(ROUTES_LAYER)) return;
          const hit = map.queryRenderedFeatures(e.point, { layers: [ROUTES_LAYER] })[0];
          if (!hit || typeof hit.id !== 'number') return;
          // Click the SELECTED route → insert a via-stop there; click an alternative → select it.
          if (hit.id === useAppStore.getState().selectedRouteIndex) {
            insertStopAt(e.lngLat.lng, e.lngLat.lat);
          } else {
            useAppStore.getState().selectRoute(hit.id);
          }
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
  // The source + layer + hover/insert handlers are created ONCE at map load; this effect only
  // pushes fresh feature data so selecting an alternative is a repaint (the route can never vanish).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const draw = () => {
      const src = map.getSource(ROUTES_SOURCE) as GeoJSONSource | undefined;
      if (!src) return;
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
      src.setData({ type: 'FeatureCollection', features });
    };

    if (map.getSource(ROUTES_SOURCE)) draw();
    else map.once('load', draw);
  }, [alternatives, selectedRouteIndex]);

  // --- community hikes (interactive vector overlay; source/layer/handlers created at load) ---
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      const src = map.getSource(COMMUNITY_SOURCE) as GeoJSONSource | undefined;
      if (!src) return;
      src.setData({
        type: 'FeatureCollection',
        features: communityHikes
          .filter((h) => h.points.length >= 2)
          .map((h) => ({
            type: 'Feature' as const,
            id: h.id,
            properties: { name: h.name, ref: h.ref ?? '' },
            geometry: {
              type: 'LineString' as const,
              coordinates: h.points.map((p) => [p.lng, p.lat] as [number, number]),
            },
          })),
      });
    };
    if (map.getSource(COMMUNITY_SOURCE)) apply();
    else map.once('load', apply);
  }, [communityHikes]);

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
        const popup = new mapboxgl.Popup({ offset: 18, closeButton: true })
          .setLngLat([poi.lng, poi.lat])
          .setDOMContent(buildPoiPopup(poi, pinned, () => popup.remove()))
          .addTo(map);
        poiPopupRef.current = popup;
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
