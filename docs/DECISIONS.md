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
