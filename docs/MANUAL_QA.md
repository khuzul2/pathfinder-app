# Manual QA — checks the loop CANNOT automate

These require real keys, a real device, or a human eye. They are **never** loop gates and
must never be faked green in an automated test. A human runs them at staging / release.

## Requires real API keys (staging only)
- [ ] `POST /api/route` returns a real snapped foot-hiking route for a known trail pair.
- [ ] `GET /api/weather` returns a live One Call 3.0 payload **including** `minutely` +
      `alerts` (confirms the exclude list wasn't over-trimmed).
- [ ] Overpass returns real huts/campsites/springs for an alpine bbox.
- [ ] RainViewer radar tiles render and animate over the map.
- [ ] Mapbox token is URL-restricted to the deployed origin; usage alerts configured.
- [ ] OpenWeather account "Calls per day" limit lowered to 1,000 (guarantees $0).

## Requires a real device / COROS
- [x] **HC-5 (confirmed):** Android can share a `.gpx` to the COROS app via the system share
      sheet (owner-verified 2026-07-13, ADR-008a). Export ships native share + download.
- [ ] Re-verify after implementing export: the shared GPX imports as a navigable **course**
      on the COROS Nomad (not a recorded activity), i.e. `<time>` omitted, `<ele>` present.
- [ ] Multi-day export: each day's course + shelter waypoints load correctly on-device.
- [ ] The plain `.gpx` download fallback works on desktop and mobile browsers.

## Container / deploy (no Docker daemon in the loop sandbox)
- [ ] `docker build --build-arg VITE_MAPBOX_ACCESS_TOKEN=pk.xxx -t pathfinder .` succeeds and
      the image runs (`docker run -p 8080:8080 --env-file .env pathfinder`, `/healthz` ok).
      Build outputs (`backend/dist/server.js`, `frontend/dist/index.html`) are verified by the
      loop; the image assembly itself is checked here / in CI.
- [ ] Cloud Run deploy: secrets mounted from Secret Manager (not baked), Mapbox token
      URL-restricted to the deployed origin.

## Human-eye / UX
- [ ] Light and dark themes both legible; WCAG AA contrast holds for text.
- [ ] Hazard styling is never color-only (icon/label present).
- [ ] `prefers-reduced-motion` disables drawer/modal animation.
- [ ] Elevation chart ↔ map hover-sync feels smooth (~60 fps) on a mid mobile device.
