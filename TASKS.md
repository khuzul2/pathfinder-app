# Pathfinder — Work Ledger

Append-only. The driver picks the first unchecked task whose dependencies are met, runs it
through planner → test-author → implement → gate, and ticks the box **only** when the named
verify command is green. Each task names its Definition-of-Done (DoD) and verify command.

Legend: `[ ]` todo · `[x]` done (gate green) · `[~]` in progress · `[!]` blocked (see
`docs/BLOCKED.md`).

---

## Phase 0 — Harness & scaffold  (this setup)

- [x] **P0-1** Monorepo (npm workspaces), tooling (TS/ESLint/Prettier/Vitest/Playwright).
      DoD: `npm ci` clean; configs present. Verify: `npm run verify:fast`.
- [x] **P0-2** Loop harness: `CLAUDE.md`, `TASKS.md`, `docs/*`, `.claude/agents/*`,
      `scripts/verify.mjs`, CI. DoD: gate + subagents defined. Verify: `npm run verify:full`.
- [x] **P0-3** Backend skeleton (`/healthz`, config, static SPA) + supertest.
      DoD: health + 501 route tests pass. Verify: `npm test`.
- [x] **P0-4** Foundational data: fixtures, zod contracts, pinned constants, seeded
      `geo.ts` reference + tests. DoD: fixtures parse contracts; lib coverage ≥ thresholds.
      Verify: `npm run verify:full`.

## Phase 1 — Secure proxy gateway  ✅ (gate green, 37 tests)

- [x] **P1-1** `POST /api/route` → ORS `foot-hiking/geojson`, injecting `ORS_API_KEY`.
      Supertest (MSW upstream) asserts fake key injected upstream + key never in client
      response + FeatureCollection shape. `backend/src/{routes,upstreams}.ts`, `route.test.ts`.
- [x] **P1-2** zod input validation + 32kb body cap + hardcoded upstream URLs (SSRF guard).
      Malformed coords/lat/lon → 400; oversized body → 413. `validation.ts`, tests.
- [x] **P1-3** `GET /api/weather` → One Call 3.0 (keeps `minutely`+`alerts`), per-IP rate
      limit, per-upstream timeouts (→504), `429→Retry-After`, short-TTL cache. `weather.test.ts`,
      `ratelimit.test.ts`.
- [x] **P1-4** Proxy Overpass (`/api/pois`) + RainViewer (`/api/radar`) with server cache +
      stable UA. `poi.test.ts`, `radar.test.ts`.
- [x] **P1-5** secret-scan gate green; prod Dockerfile + dev `docker-compose` + `.dockerignore`
      present; build outputs match the image COPY sources; compiled server smoke-tested
      (`/healthz` ok, 503 on missing key, 400 on bad input). NOTE: `docker build` itself runs
      in CI / manual QA (no daemon in the loop's sandbox) — see `docs/MANUAL_QA.md`.

## Phase 2 — Map workspace & basemap  ✅ (gate green incl. e2e, 64 unit/component tests)

- [x] **P2-1** Mapbox GL canvas (Outdoors), token from `VITE_` env, always-on attribution.
      `MapCanvas.tsx` lazy-imports mapbox-gl (keeps ~800KB out of the initial chunk, out of
      jsdom); `Attribution.tsx` credits OSM/Mapbox/ORS/RainViewer (tested).
- [x] **P2-2** RainViewer radar overlay built from `weather-maps.json` (`buildRadarTileUrl`,
      maxzoom 7, color id 2) + `RadarToggle`. Pure URL logic unit-tested; toggle e2e-tested.
- [x] **P2-3** Light/dark theme toggle (`ThemeToggle` + `useApplyTheme`), persisted to
      localStorage, full dark token set in Tailwind. Unit + component + e2e (persist on reload).
- Notes: real Mapbox rendering needs a **public `pk.` token** (manual QA); the `secret-scan`
  gate now also fails on a leaked Mapbox `sk.` secret token.

## Phase 3 — Route snapping & elevation (Tobler)  ✅ (gate green, 102 tests)

- [x] **P3-1** Click-to-add + draggable waypoint markers on the map; a Clear control.
      Imperative Mapbox wiring in `MapCanvas.tsx` (manual QA); store holds `waypoints`.
- [x] **P3-2** `routeApi.requestRoute` → `/api/route`, validated with `OrsRouteResponseSchema`;
      `useRoute` (TanStack Query + AbortController) cancels stale/out-of-order requests and
      mirrors results/errors into the store; snapped GeoJSON line drawn on the map.
      MSW-backed tests (`routeApi.test.ts`, `useRoute.test.tsx`).
- [x] **P3-3** `tobler.ts` (speed/effective/segment-time) + `elevation.ts`
      (resample/smooth/slope-clamp/ascent) + `surfaceFactor.ts` (ORS code→γ) + `route.ts`
      (`analyzeRoute` pipeline). Exhaustive unit tests incl. a GOLDEN route test on the ORS
      fixture (ascent ≈32.9 m, sane distance/time). `ElevationCard` shows distance/ascent/
      time; `ElevationChart` (Recharts) drives chart↔map hover-sync. Verify: `npm run verify:full`.
- Notes: ORS elevation is the single source of truth; time computed on ORS vertices so
  surface γ maps cleanly (resample/smooth helpers reserved for dense-DEM/slicing). Real map
  rendering + live routing = manual QA (needs a pk. token + backend keys).

## Phase 4 — Multi-day slicing & POI  ✅ (gate green, 118 tests)

- [x] **P4-1** Overpass POI layer via `/api/pois`: `poiApi.parseOverpassPois` (huts/campsites/
      springs), `usePois` (zoom-gated TanStack Query keyed on rounded bbox, viewport-driven),
      colored map markers. `poiApi.test.ts`, `usePois.test.tsx`.
- [x] **P4-2** Pin a shelter as a nightover stop: hut/campsite markers toggle `forcedStopIds`;
      when any are pinned the slicer is constrained to them.
- [x] **P4-3** `slicing.ts` — `matchSheltersToRoute` (≤500 m cross-track) + `planDays`
      time-based DP (ADR-002) minimizing Σ(dayTime−target)² s.t. day ≤ cap, with edge cases
      (fits-in-one-day, no-shelter-over-cap fallback+warning, lower-cost split, buffer, dedup,
      interior-only). `DaySlicer` UI (hours/day + day list) + `useDayPlan`. `slicing.test.ts`,
      `DaySlicer.test.tsx`. Route model gained cumulative `timeSeconds`.

## Phase 5 — Responsive UX & COROS export

- [ ] **P5-1** Vaul bottom sheet + desktop sidebar; Recharts elevation with map↔chart
      hover-sync.
- [ ] **P5-2** `gpx.ts` — namespaced GPX 1.1 course (per SPEC §4), XSD + round-trip tests.
- [ ] **P5-3** Capacitor share bridge (mocked native in tests) + web `.gpx` download fallback;
      Android build in CI. Verify: `npm run verify:full` + `docs/MANUAL_QA.md`.

---

## Human-confirmation items — RESOLVED (see ADR-009 / ADR-008a)
- [x] **HC-1..HC-4** Calibration constants accepted as sensible defaults (ADR-009); the
      values in `constants.ts` are authoritative. Optional P3 follow-up: calibrate against
      real GPS tracks / known route times, changing constant + test together.
- [x] **HC-5** COROS GPX delivery confirmed: Android native share works; export ships both
      the native share (Capacitor) and a plain `.gpx` download everywhere (ADR-008a).
