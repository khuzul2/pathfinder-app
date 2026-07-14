# Architecture Decision Records

Append-only. Each ADR records a decision the loop must not relitigate. New ambiguities the
loop resolves during a build get a new ADR here (short is fine).

The first eight ADRs were decided by the product owner during blueprint review
(2026-07-13), after a six-lens adversarial review of the original blueprint.

---

## ADR-001 — Loop tests run against hermetic MSW mocks, never real keys
**Status:** Accepted. **Context:** ORS/OpenWeather/Overpass/RainViewer/Mapbox are all
network-gated (OpenWeather even card-gated); the loop has no keys and a flaky gate is fatal
to an autonomous agent. **Decision:** All tests use MSW (`onUnhandledRequest: 'error'`) with
frozen fixtures in `test/fixtures/`. `.env.test` holds obviously-fake keys; integration
tests assert the proxy forwards exactly the fake value upstream. Real keys are used only by
a human at manual-QA/staging. **Consequences:** deterministic, cost-free, offline gate;
fixtures must be kept faithful (zod-guarded) and later swapped for captured-real responses.

## ADR-002 — Multi-day routes are sliced by TIME (Tobler), not distance
**Status:** Accepted. **Context:** blueprint contradicted itself (6 h/day vs 15 km/day); in
mountains time and distance diverge. **Decision:** slice by cumulative Tobler moving time
(`SLICING.targetHoursPerDay`), distance shown as a secondary readout. **Consequences:** the
slicer depends on the Tobler + γ constants, so those must be pinned/confirmed before Phase 4
(they are, in `constants.ts`). A distance-only fallback readout remains available.

## ADR-003 — ORS elevation is the single source of truth
**Status:** Accepted. **Context:** blueprint used ORS elevation AND Mapbox Terrain-RGB, two
different DEMs → inconsistent ascent/time. **Decision:** use ORS `/geojson` per-vertex
elevation for slope, Tobler, ascent, and the chart; delete the Terrain-RGB elevation path.
A raster-DEM (`mapbox-terrain-dem-v1`) is permitted only for optional 3D hillshade, never
blended into profile numbers.

## ADR-004 — Single-user, private application
**Status:** Accepted. **Decision:** no auth, no accounts, no server DB; plans persist in
`localStorage`/IndexedDB. Deploy privately/unlisted. **Consequences:** neutralizes the
open-proxy abuse surface (origin allow-list + private URL) and avoids a
stored-location privacy-policy obligation. The loop must NOT half-build accounts.

## ADR-005 — Google Sans (SIL OFL) replaces Product Sans
**Status:** Accepted. **Context:** Product Sans is proprietary and cannot be legally bundled.
**Decision:** headings use Google Sans (OFL, near-identical); body stays Roboto/Noto Sans.
Self-hosted font files. Consider moving off Google's exact brand hexes to reduce trade-dress
risk (optional).

## ADR-006 — Deploy to Google Cloud Run behind one fixed custom domain
**Status:** Accepted. **Decision:** Cloud Run + a single custom domain, registered in Mapbox
URL restrictions and the proxy CORS/origin allow-list. Secrets via Secret Manager (mounted
env, not image-baked, not `--set-env-vars`); explicit region / min-max instances /
concurrency; `--allow-unauthenticated` paired with Cloud Armor/API Gateway edge protection.

## ADR-007 — Loop roles: Sonnet driver + pinned Opus subagents
**Status:** Accepted. **Decision:** a Sonnet `/loop` driver orchestrates; `planner`,
`test-author`, and `fixer` (`model: opus`) in `.claude/agents/` do the thinking, invoked at
fixed gates. Mechanical enforcement beats one model self-partitioning. **Consequences:**
Opus is scoped to planning/testing/fixing; the driver owns the ledger and commits.

## ADR-008 — Mobile delivery via Capacitor (native GPX share)
**Status:** Accepted. **Context:** Chromium's Web Share API rejects `.gpx` files, so a PWA
cannot hand a route to COROS via the share sheet. **Decision:** wrap with Capacitor and use
`@capacitor/filesystem` + `@capacitor/share` (native `Intent.ACTION_SEND` bypasses the MIME
allowlist); keep a plain `.gpx` blob download as the web/desktop fallback. Add the Android
(Gradle) build to CI in Phase 5. **Open item:** empirically confirm COROS registers a GPX
share/open intent; if not, ship "save GPX, then import in COROS" UX regardless of wrapper
(tracked in `MANUAL_QA.md`).

## ADR-009 — Accept transcribed default calibration constants (no source-image confirmation)
**Status:** Accepted (2026-07-13). **Context:** the Tobler equation, the four surface γ
factors, γ direction, and the Overpass zoom threshold lived only in unreadable blueprint
images; the owner is not an expert and cannot confirm them. **Decision:** treat the
transcribed values in `frontend/src/lib/constants.ts` as the authoritative spec — canonical
Tobler `W(S)=6·exp(-3.5·|S+0.05|)`, γ as a velocity multiplier ∈ (0,1] with paved = 1.0,
`OVERPASS_MIN_ZOOM = 11`, `SAC_SCRAMBLE_GAMMA = 0.5`, `SLICING` 6 h target / 8 h cap.
**Consequences:** the loop proceeds without a human gate on these numbers. They are
sensible defaults, not measured calibration; refine later against real GPS tracks / known
route times (a P3 follow-up), always changing the constant and its test together.

## ADR-008a — COROS GPX delivery confirmed (native share works; keep download too)
**Status:** Accepted (2026-07-13), supersedes the open item in ADR-008. **Context:** the
owner confirmed on-device that Android can share a `.gpx` to the COROS app via the system
share sheet. **Decision:** ship BOTH paths — (1) Capacitor native share
(`@capacitor/share` + `@capacitor/filesystem`) targeting the COROS app on Android, and
(2) a plain `.gpx` file download on every platform (web/desktop + as an always-available
fallback on mobile). The export UI offers both. **Consequences:** HC-5 is resolved; the
Web Share MIME limitation is moot because the native intent path is used on Android.

## ADR-010 — Trail-difficulty coloring + hiking overlay; demo talks to upstreams directly
**Status:** Accepted (2026-07-13). **Context:** Phase 6 needed the web demo to show *real*
trails/POIs (not just synthetic shapes) and to convey mountain-trail difficulty, while the
loop still has no API keys and coverage is gated only on `lib/**`. **Decisions:**
1. **Difficulty as data, not chrome.** ORS `extra_info: ['surface','traildifficulty',
   'steepness']` is requested on every route; `lib/difficulty.ts` maps the SAC hiking scale
   (T1–T6) to a fixed color ramp and splits the geometry into constant-grade
   `difficultySegments`. The map paints one line feature per segment via a data-driven
   `['get','color']`; the sidebar shows only the grades actually present. This keeps the
   mapping pure + unit-tested and out of the imperative map layer.
2. **A data-source seam** isolates env-branching from `lib/**` (coverage safety): the public
   demo (`VITE_DEMO=1`) calls ORS directly (`VITE_ORS_API_KEY`, or a synthetic fallback when
   unset), plus keyless Overpass + RainViewer, all in `demo/directApi.ts`; production routes
   through the backend proxy. `services/dataClient.ts` picks the path. No secret ever reaches
   `lib/**`, and the fallback means the demo renders even with no key configured.
3. **Waymarked Trails** (`tile.waymarkedtrails.org/hiking`) is the toggleable hiking-route
   raster overlay — a rendered OSM route layer, NOT an elevation/profile source, so ADR-003
   (ORS is the single source of truth for elevation numbers) is preserved. Its attribution is
   carried on the raster source. **Consequences:** the live demo shows real snapped trails,
   SAC-colored difficulty, filterable POIs, and an optional route overlay; adding the ORS
   secret upgrades synthetic routes to real ones with no code change.

## ADR-011 — Capacitor 8 Android wrapper: native share plugin, ephemeral native project
**Status:** Accepted (2026-07-13), implements ADR-008/008a. **Context:** the COROS delivery
path is an Android share intent; the loop sandbox has no Android SDK, so the APK build is
human-only, but the JS/TS integration is testable and belongs in the gate. **Decisions:**
1. **Native share as an injectable seam.** `services/nativeShare.ts` writes each GPX to the
   Capacitor `Directory.Cache` and hands the `file://` URIs to `@capacitor/share`;
   `services/share.ts` tries this first (`Capacitor.isNativePlatform()`), then the Web Share
   API, then a `.gpx` download. The Capacitor bridge is injected via a `NativeShareAdapter`
   so the decision logic is unit-tested in Node with the plugins mocked — no device needed.
   Kept in `services/` (not `lib/`) so the coverage gate stays lib-only.
2. **Ephemeral `android/`** (already gitignored): the native project is regenerated from
   `frontend/capacitor.config.ts` via `npm run android:add`, never committed or hand-edited.
   Avoids a large unverifiable native tree in the repo and keeps `capacitor.config.ts` the
   single source of truth. Trade-off: no committed release-signing config — a debug APK (or a
   keystore kept outside the repo) suffices for the single-user private install (ADR-004).
3. **Mobile build = demo mode.** `build:mobile` runs `VITE_DEMO=1` at base `/` so the APK is
   self-contained (device calls ORS/Overpass/RainViewer directly), no deployed backend needed.
   The ORS key is baked into the APK; acceptable for a private, single-user, URL/key-restricted
   install. **Consequences:** `verify` covers the share integration; APK build + on-device COROS
   import remain in `docs/MANUAL_QA.md` (P7-2), never faked green.

## ADR-012 — Export UX: a reliable download, sharing is best-effort with fallback
**Status:** Accepted (2026-07-14). **Context:** the single "Export to COROS" button called
Web Share first and `await`ed `navigator.share()` with no `catch`. In any browser that exposes
Web Share for files (desktop Chrome on Windows/ChromeOS, Android Chrome), a rejected or
dismissed share left the promise rejected and **never fell through to the download** — the
button appeared to do nothing (owner-reported on the web app, 2026-07-14). **Decision:** split
the action. `services/share.ts` now exposes `downloadGpxFiles` (a direct `<a download>` that
works in every browser — with a deferred `revokeObjectURL` so the download isn't cancelled
mid-flight), `canShareGpx` (native, or a browser that truly `canShare({files})`), and `shareGpx`
which **throws** when sharing is impossible or fails. `ExportButton` leads with **Download GPX**
on web (primary, always works) and shows **Share to COROS** only when `canShareGpx()`; the
Capacitor build leads with **Export to COROS** (native share) and offers Download as a fallback.
Any non-abort share failure downloads instead. **Consequences:** the web download is reliable
regardless of Web Share support; sharing is an enhancement, never a dead end. Unit-tested via
injected `nav`/`native` seams; the real download mechanism was confirmed in headless Chromium.

## ADR-013 — Mapbox powers address/POI search; stops carry names
**Status:** Accepted (2026-07-14). **Context:** Phase 8 adds a search box to add named stops
(addresses + POIs), needing a geocoder. **Decision:** use **Mapbox Geocoding v6** client-side
(the Mapbox token is already the one allowed client credential — CLAUDE.md invariant 1 — so no
backend/ORS dependency, and search works even without the ORS key). `lib/geocode.ts` parses the
response (pure, coverage-gated) behind `contracts/mapbox.ts`; `services/geocodeClient.ts` builds
the request (token injectable for tests); `usePlaceSearch` + a 300 ms debounce drive `SearchBox`.
The `Waypoint` model gains an optional `name`, so searched places and map clicks share one
ordered stop list (`WaypointList`: start/via/end roles, reorder, reverse). **Consequences:** a
second Mapbox API surface (geocoding attribution added); a bad/absent token degrades to no
suggestions, never a crash. ORS remains the single source of truth for routing + elevation.

## ADR-014 — Multi-user saved routes: local autosave now, Supabase + Google OAuth next
**Status:** Accepted (2026-07-14), **supersedes ADR-004** (single-user, no auth/DB). **Context:**
the owner asked for a "My routes / New route" manager where each user's routes autosave and
recall on login. That overturns the single-user assumption and needs a DB + OAuth. **Decisions:**
1. **Ship the manager on local autosave first (P9a).** `lib/savedRoute.ts` (pure: model +
   serialize/deserialize, coverage-gated) + `services/routeStorage.ts` behind a `RouteStorage`
   interface (`localRouteStorage` today). Store gains `savedRoutes`/`currentRouteId` +
   new/open/rename/delete/persistCurrent; `useRouteAutosave` (800 ms debounce) upserts the
   working route; `RoutesPanel` lists them (open · rename · delete · download GPX). Works on the
   static demo with zero setup — the "easiest yet scalable" first rung.
2. **Cloud multi-user via Supabase (P9b).** Easiest scalable fit: Postgres + built-in Google
   OAuth + Row-Level Security, all reachable from the static frontend with a public **anon key**
   (security is enforced by RLS/JWT, not key secrecy — so, like the Mapbox `pk.` token, the anon
   key is an allowed client credential; this extends CLAUDE.md invariant 1, and `secret-scan`
   still blocks true server keys). `supabaseRouteStorage` will implement the same `RouteStorage`
   shape, so P9a's UI/store are unchanged. Requires the owner to create the Supabase project +
   Google OAuth credentials (hands-on, like the Mapbox/ORS keys). **Consequences:** immediate
   local value; a small, well-isolated swap to per-user cloud sync; ADR-004 retired.

## ADR-015 — Routing options: profile-based road avoidance + bivvy-anywhere overnights
**Status:** Accepted (2026-07-14). **Context:** users wanted to (a) avoid vehicle-traffic roads
and (b) auto-place overnight stays including wild camps. ORS has no per-request "avoid roads"
for foot profiles. **Decisions:** (1) **Avoid roads = profile choice** — `foot-hiking` (prefers
trails/paths) vs `foot-walking` (direct, road-tolerant), threaded end-to-end as a validated enum
(SSRF-safe URL on the backend). (2) **Overnight stays** reuse the time-based day slicer (ADR-002):
the stay-type multi-select filters candidate shelters (hut/campsite), and **bivvy** adds every
interior vertex as a candidate day-boundary with a squared-error penalty (~20% of ideal), so the
DP prefers a real shelter when one is close and drops a wild camp at the ideal spacing otherwise.
`autoOvernight` gates it (off → single push). **Consequences:** a real, testable behavior change
for road avoidance; multi-day plans now always exist when wanted (bivvy guarantees a legal split).
The overnight-stop map markers (bivvy pins) are a small follow-up.

## ADR-016 — Alternative routes: ORS alternatives + honest superlative labels
**Status:** Accepted (2026-07-14). **Context:** users want to pick from route options that
"make sense". **Decisions:** (1) **Source** — ORS `alternative_routes` (target_count 3), which
only supports a start→end pair, so alternatives appear only for a 2-stop route; the response's
features are ALL analyzed (`toRouteAnalyses`). It is **best-effort**: the demo path retries
without alternatives and then falls back to a synthetic route, so the primary route always
renders; the backend forwards a validated `alternatives` flag. (2) **Labels are honest** —
`labelAlternatives` calls the first (ORS-recommended) "Recommended" and gives each other option
the superlative it genuinely wins across the set (Fastest / Shortest / Least climbing), else a
numbered "Alternative"; the card shows time · distance · ascent so the user chooses on real
trade-offs. (3) **Selection** — `alternatives` + `selectedRouteIndex` in the store; `route`
mirrors the selected one (so elevation/day-plan/export follow it); non-selected routes draw as
faded grey lines beneath the coloured main line. **Consequences:** meaningful, non-misleading
choices for point-to-point routes; multi-stop routes simply show the single computed route. A
"scenic"/surface-weighted variant is a possible future addition (needs a per-route paved metric).

## ADR-017 — Route rendering & map interaction refinements (from live QA)
**Status:** Accepted (2026-07-14); amends ADR-010's on-map difficulty coloring. **Context:**
live testing found the selected route hard to see and to distinguish from alternatives, the
route occasionally appearing "lost", and clunky stop entry. **Decisions:** (1) the **selected
route is a solid blue line drawn from `route.points`** (not the per-SAC-segment coloring) — robust
(never blank from a degenerate segment split), clearly visible over green terrain, and distinct
from the grey alternatives; SAC difficulty stays in the sidebar legend (map difficulty coloring
is dropped). The selected route is force-raised above the alternatives (`moveLayer`). (2)
**Alternatives** are a stronger grey and interactive — hover highlights, click selects. (3) Stops
are added by **double-click** (single click is reserved for selecting an alternative; default
double-click-zoom disabled), snapping to a POI within ~100 m or reverse-geocoding a place/address
name so the stop list shows names, not raw coordinates. (4) The stop list is **drag-and-drop
reorderable** (↑/↓ retained for accessibility). **Consequences:** clearer, more predictable map
UX; difficulty is legend-only on the map (a colored overlay could return as a future option).
