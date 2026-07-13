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
