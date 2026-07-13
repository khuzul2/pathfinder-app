# Pathfinder App — Corrected Master Specification

> This is the loop-executable spec. It supersedes the original blueprint wherever they
> disagree, folding in the review findings and the eight product decisions
> (`DECISIONS.md`). Every value the original blueprint hid inside an image is transcribed
> here in text. Numbers marked **CONFIRM** are transcribed defaults a human must verify
> against the source image before the relevant phase ships.

## 0. Product shape & scope

- **Single-user, private tool** (ADR-004). No auth, no accounts, no server database. The
  current plan autosaves to `localStorage`/IndexedDB with explicit save / name / list /
  delete. Planning happens at home; navigation happens on the watch, so the app is
  online-only and offline tile caching is out of scope for the initial build.
- **Units:** metric by default. (An imperial toggle is optional — COROS has a large US
  audience — but not required for v1.)
- **Hosting:** Google Cloud Run behind one fixed custom domain (ADR-006).

## 1. Architecture, proxy & security

Client (Vite + React) renders Mapbox directly with the public `VITE_MAPBOX_ACCESS_TOKEN`.
Everything key-bearing goes through the Express gateway, which injects server secrets:

- `POST /api/route`   → OpenRouteService `foot-hiking/geojson` (injects `ORS_API_KEY`)
- `GET  /api/weather` → OpenWeather One Call 3.0 (injects `OPENWEATHER_API_KEY`)
- `GET  /healthz`     → liveness/readiness (Docker HEALTHCHECK + Cloud Run probe)
- Overpass + RainViewer are also proxied (server-side cache + stable User-Agent), not hit
  directly from the browser on every viewport move.

**Proxy hardening (all required — the proxy is otherwise a denial-of-wallet relay):**
- **Input validation (zod):** `lat ∈ [-90, 90]`, `lon ∈ [-180, 180]`, `coordinates` as
  bounded `[lon, lat]` float pairs with a max element count; reject others with `400`.
- **No client-controlled upstream:** hardcode upstream base URLs, paths, and the ORS
  profile server-side; allow-list exactly the two upstream calls. Never forward a
  client-supplied host/URL (SSRF).
- **Body cap:** `express.json({ limit: '32kb' })`.
- **Per-IP rate limit** tuned under the 40/min ORS ceiling, backed by a shared store
  (Memorystore/Redis) because Cloud Run autoscales to many instances.
- **CORS allow-list** (Vite dev origin + WebView origin; same-origin in prod).
- **Timeouts & mapping:** 8–10 s per-upstream timeout, bounded backoff on idempotent GETs,
  `429 → Retry-After` passed through into the toast error contract.
- **Cache:** short-TTL, keyed on rounded coordinates (weather ~10 min; route by payload
  hash) — respecting OpenWeather's caching ToS.
- **Secrets:** never image-baked. `.dockerignore` excludes `.env*`; Cloud Run mounts keys
  from Secret Manager. `npm ci --omit=dev`, `USER node` (non-root).

**Mapbox token reality:** the public token is embedded in the bundle by design. URL/origin
restriction protects the **web** origin (Referer/Origin headers) but NOT a wrapped WebView
/ APK, which doesn't present them. For Android, treat the token as compromised-by-design:
minimum scope, usage alerts, ready to rotate (documented accepted risk). Free tier is
**50,000 map loads/month** (not 100k).

## 2. Routing, elevation & Tobler

### 2.1 ORS contract (corrected)
`POST https://api.openrouteservice.org/v2/directions/foot-hiking/geojson` (the `/geojson`
suffix is mandatory — the base endpoint returns an **encoded polyline string**, 3D-encoded
when `elevation:true`, which a standard decoder cannot read). Body:
```json
{ "coordinates": [[11.5761,48.1374],[11.582,48.1402]],
  "elevation": true,
  "extra_info": ["surface", "traildifficulty", "steepness"] }
```
The response `features[0].geometry.coordinates` are raw `[lng, lat, elevation]` arrays.
`extras.surface.values` are `[startIdx, endIdx, code]` **integer-code index triples** — not
OSM strings. Free tier: **2,000 req/day, 40 req/min**. A 500 ms debounce alone permits
~120/min, so also enforce a hard client-side min-interval / in-flight guard during rapid
multi-waypoint edits, and handle `x-ratelimit-*` headers with 429/403 backoff.

### 2.2 Elevation source of truth
**ORS elevation only** (ADR-003). The per-vertex elevation returned above feeds slope,
Tobler, ascent totals, and the elevation chart. Do **not** sample Mapbox Terrain-RGB for
elevation. (If 3D hillshade is ever wanted, use tileset `mapbox-terrain-dem-v1`,
`h = -10000 + (R*65536 + G*256 + B)*0.1` m — never blended into the profile.)

### 2.3 Tobler's Hiking Function (transcribed)
```
W(S) = 6 · exp(-3.5 · |S + 0.05|)      [km/h]      (CONFIRM against image5)
S    = ΔH / ΔX_horizontal              (tangent; ΔX via haversine, never 3D length)
v_i  = min(6, γ_i · W(S_i))            (γ is a velocity multiplier in (0,1])
t_i  = d_i / v_i ;  T = Σ t_i ;  keep cumulative T(s) for the slicer
```
**Numerical stability (required):** resample the polyline to uniform ~25–30 m horizontal
spacing; smooth elevation (moving-average or Savitzky-Golay, ~5–7 window) **before**
differentiating; clamp `|S| ≤ 0.6` (~31°) so `exp()` can't collapse on DEM noise.

### 2.4 Surface difficulty γ (transcribed → `constants.ts`)
γ multiplies velocity; **paved = 1.0 baseline** (γ never exceeds 1). Keyed off the ORS
surface **integer code**, with the technical-scramble penalty sourced from
`traildifficulty` (SAC ≥ T3 → γ ≈ 0.5), because surface has **no** rock/scree/mud code.
The full code→γ map lives in `frontend/src/lib/constants.ts` (`SURFACE_GAMMA`). The four
headline factors (asphalt / gravel / dirt / technical) are **CONFIRM** vs images 8–11.

## 3. External integrations

### 3.1 Overpass (POI) — proxied
Query `tourism=alpine_hut`, `tourism=camp_site`, `natural=spring` in a bbox
(order **south,west,north,east** — correct as written). Fetch only at/above
`OVERPASS_MIN_ZOOM` (**CONFIRM** image12; default 11); debounce viewport queries; cache
per-bbox; route through the gateway with a stable User-Agent + short server cache.

### 3.2 OpenWeather One Call 3.0 — proxied
`GET /data/3.0/onecall?lat={lat}&lon={lon}&units=metric&appid={key}`. **Do NOT exclude
`alerts` or `minutely`** — they ARE the "rain alerts" and "real-time rain" features. Trim
only unrendered `hourly`/`daily` if needed. One Call by Call requires a card on file; to
guarantee $0, lower the account "Calls per day" limit from the 2,000 default to 1,000.
Define cap-hit UX: cached last forecast + disabled pane + toast.

### 3.3 RainViewer — proxied
`GET https://api.rainviewer.com/public/weather-maps.json`. Build tile URLs from the
returned `host` + frame `path` (versioned/dynamic — never hardcode the path). Post-2026
free tier: raster source `maxzoom: 7` (overzoom past z7), color scheme id **2**
("Universal Blue", the only free scheme). Re-poll frames ~every 10 min; stay under
100 req/IP/min.

### 3.4 Multi-day slicing (time-based — ADR-002)
Slice by **moving time** using cumulative `T(s)`. Cut points at
`argmin over feasible shelters of |T(s_hut) − k·T_target|`; a DP minimizes
`Σ (T_day − T_target)²` s.t. `T_day ≤ T_cap` (~8 h moving). Shelter candidacy =
cross-track distance ≤ 500 m AND projected arc-length within ~±1 h of the target cut; fold
the detour walk to/from the hut into the day budget; add a break allowance
(`moving_time · 1.2`). **Empty-buffer fallback** (the common alpine case): iteratively
widen, then snap to nearest-beyond with an over/undershoot warning, allow a manual
wild-camp node, and surface "no viable stop for day N". Defaults in `constants.ts`
(`SLICING`). Surface distance as a secondary readout.

## 4. GPX export (COROS)

Root element (required — the blueprint's namespace-less root is invalid):
```xml
<gpx version="1.1" creator="Pathfinder"
     xmlns="http://www.topografix.com/GPX/1/1"
     xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
     xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
```
- Child order `metadata → wpt* → trk*`; inside `trkpt`, `<ele>` before `<time>`.
- **Omit `<time>`** so COROS treats it as a navigable **course**, not a recorded activity.
- Export as `<trk>/<trkseg>/<trkpt>` with `<ele>`; shelters as `<wpt>`.
- Coordinates at 6–7 decimals with a `.` separator (guard against locale `,`).
- Douglas-Peucker simplify to ~5–10 m tolerance to stay under COROS course-point limits.
- **One GPX per day** (zipped bundle), each a single course + its shelter `<wpt>`s, plus a
  combined whole-route file as secondary.
- Tests validate against `gpx.xsd` (XSD) AND round-trip parse (coords + ele survive).
  Physical COROS import is manual QA, not a loop gate (`MANUAL_QA.md`).

## 5. UI / UX

Stack: React 19, Tailwind v3 (pinned), mapbox-gl, TanStack Query (fixes out-of-order
debounced routes via AbortController), Zustand (shared state incl. map↔chart hover-sync),
Recharts (elevation), Vaul (mobile bottom sheet), Radix Toast, `motion` (framer-motion
successor — gate animations behind `prefers-reduced-motion`).

- **Fonts:** headings **Google Sans** (SIL OFL, replacing proprietary Product Sans — ADR-005);
  body Roboto/Noto Sans. Self-host the font files (no external CSS request).
- **Layout:** desktop `md:grid-cols-[380px_1fr]` sidebar + map + elevation card; mobile
  fullscreen map + FABs + Vaul bottom sheet. Use `100dvh/svh` for the map.
- **Theme:** complete light AND dark token sets (`darkMode: 'class'` + `prefers-color-scheme`
  + persisted choice). Decide the dark map style explicitly (Outdoors is light-only;
  dark-v11 drops topo detail — tradeoff recorded when implemented).
- **Accessibility:** non-map waypoint entry (coordinate/place + editable list); elevation
  series exposed as an accessible data table; hazard never encoded by color alone (pair
  `#EA4335` with an icon/label); meet WCAG AA contrast (note `#0F9D58` on `#F8F9FA` is
  ~3.5:1 — not for small text); respect `prefers-reduced-motion`.
- **Attribution control** always visible (OSM · Mapbox · ORS · RainViewer) + about/splash.

## 6. Phase acceptance criteria (machine-checkable)

Every phase "done" is a deterministic assertion over the **mocked** network (MSW +
`page.route`), not a human/live/device observation. Genuinely un-automatable checks live in
`MANUAL_QA.md` and never gate the loop.

- **P1 Proxy:** supertest proves `/healthz` ok; `/api/route` injects the fake ORS key
  upstream and never returns it to the client; malformed `coordinates → 400`; upstream
  `429 → Retry-After` mapped to the toast contract.
- **P2 Map:** e2e boots the map with a stubbed Mapbox style/tiles + stubbed
  `weather-maps.json`; radar layer toggles on/off; light/dark toggle persists.
- **P3 Route+Tobler:** drop pins → `GET /api/route` (ORS fixture) → a GeoJSON line layer
  with N points renders → the elevation card shows the fixture's ascent → Tobler unit tests
  (uphill/downhill/flat, the −0.05 offset, γ per surface code) pass.
- **P4 Slicing+POI:** Overpass fixture POIs render; a route splits into day segments at
  shelter nodes; slicing unit tests cover the edge cases (track < one day, no shelter in
  buffer, shelter on the boundary, multiple in-buffer tie-break).
- **P5 UX+Export:** Export downloads a schema-valid `.gpx` (XSD + round-trip test); Vaul
  sheet + Recharts hover-sync work; Capacitor share path is unit-tested with a mocked
  native bridge (real device/share intent = manual QA).
