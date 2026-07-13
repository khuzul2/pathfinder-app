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

## Phase 1 — Secure proxy gateway

- [ ] **P1-1** `POST /api/route` → ORS `foot-hiking/geojson`, injecting `ORS_API_KEY`.
      DoD: supertest (MSW upstream) asserts (a) fake key injected upstream, (b) key never in
      client response, (c) response validates `OrsRouteResponseSchema`. Verify: `npm test`.
- [ ] **P1-2** zod input validation + body cap + upstream allow-list (SSRF guard).
      DoD: malformed `coordinates`/`lat`/`lon` → 400; oversized body → 413. Verify: `npm test`.
- [ ] **P1-3** `GET /api/weather` → One Call 3.0 (keep `minutely`+`alerts`), per-IP rate
      limit, timeouts, `429→Retry-After`, short-TTL cache. DoD: contract + limiter + cap-hit
      tests green. Verify: `npm test`.
- [ ] **P1-4** Proxy Overpass + RainViewer (server cache, stable UA). DoD: fixture-backed
      contract tests. Verify: `npm test`.
- [ ] **P1-5** `no-secret-leak` test + prod Dockerfile + `docker-compose` dev + `.dockerignore`
      verified. DoD: `verify:full` secret-scan green; `docker build` succeeds. Verify: `npm run verify:full`.

## Phase 2 — Map workspace & basemap

- [ ] **P2-1** Mapbox GL canvas (Outdoors), token from `VITE_` env, attribution control.
- [ ] **P2-2** RainViewer radar overlay from `weather-maps.json` (maxzoom 7, color id 2),
      toggle. DoD: e2e (mocked tiles) toggles the layer.
- [ ] **P2-3** Light/dark theme toggle (persisted) + full dark token set.

## Phase 3 — Route snapping & elevation (Tobler)

- [ ] **P3-1** Pin drop / drag waypoints (draggable markers, keyboard-accessible alt entry).
- [ ] **P3-2** Wire pins → `/api/route`; render snapped GeoJSON line (TanStack Query +
      AbortController fixes out-of-order).
- [ ] **P3-3** `tobler.ts` + `elevation.ts` (resample/smooth/clamp) from ORS elevation;
      elevation card + ascent. DoD: unit tests (uphill/downhill/flat, −0.05 offset, γ by
      surface code) + a golden route time within tolerance. Verify: `npm run verify:full`.

## Phase 4 — Multi-day slicing & POI

- [ ] **P4-1** Overpass POI layer (huts/campsites/springs), zoom-gated, cached.
- [ ] **P4-2** Mark a shelter node as a nightover stop.
- [ ] **P4-3** `slicing.ts` — time-based DP (ADR-002) with all edge cases tested.
      Verify: `npm run verify:full`.

## Phase 5 — Responsive UX & COROS export

- [ ] **P5-1** Vaul bottom sheet + desktop sidebar; Recharts elevation with map↔chart
      hover-sync.
- [ ] **P5-2** `gpx.ts` — namespaced GPX 1.1 course (per SPEC §4), XSD + round-trip tests.
- [ ] **P5-3** Capacitor share bridge (mocked native in tests) + web `.gpx` download fallback;
      Android build in CI. Verify: `npm run verify:full` + `docs/MANUAL_QA.md`.

---

## Human-confirmation-required (do NOT let the loop guess — see `constants.ts`)
- [ ] **HC-1** Confirm the Tobler equation constants against blueprint **image5/image2**.
- [ ] **HC-2** Confirm the four surface γ factors against **image8–image11**.
- [ ] **HC-3** Confirm γ is applied as a velocity **multiplier** (direction) per **image7**.
- [ ] **HC-4** Confirm the Overpass POI zoom threshold against **image12**.
- [ ] **HC-5** Confirm COROS accepts a GPX course share/open intent (see `MANUAL_QA.md`).
