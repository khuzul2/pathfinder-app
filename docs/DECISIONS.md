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
