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
- [ ] **HC-5:** Export a GPX and confirm the COROS Nomad imports it as a navigable course
      (via share intent OR in-app file import). If there is no GPX share/open intent, the
      UX is "save GPX, then import in COROS" — update ADR-008 accordingly.
- [ ] Multi-day export: each day's course + shelter waypoints load correctly on-device.
- [ ] Android: Capacitor native share sheet targets the COROS app with the `.gpx` file.

## Human-eye / UX
- [ ] Light and dark themes both legible; WCAG AA contrast holds for text.
- [ ] Hazard styling is never color-only (icon/label present).
- [ ] `prefers-reduced-motion` disables drawer/modal animation.
- [ ] Elevation chart ↔ map hover-sync feels smooth (~60 fps) on a mid mobile device.
