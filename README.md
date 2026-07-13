# Pathfinder App

A topographic hiking route planner: snap-to-trail routing, Tobler-based time & elevation,
live weather + Doppler radar, multi-day shelter slicing, and one-tap **GPX export to the
COROS Nomad** watch. Built by a disciplined autonomous Claude Code loop (Sonnet 5 drives;
Opus plans, writes tests, and fixes).

> **Status:** Phase 0 (harness & scaffold). The app itself is built phase-by-phase by the
> loop — see [`TASKS.md`](./TASKS.md). Start with [`docs/SPEC.md`](./docs/SPEC.md).

## Quick start

```bash
nvm use                 # Node 22 (see .nvmrc)
cp .env.example .env     # fill in real keys for manual/local runs (loop uses mocks)
npm run bootstrap        # npm ci across workspaces
npm run dev              # Vite (http://localhost:5173) + Express gateway (:8080)
npm run verify:fast      # the gate: format → lint → typecheck → unit
npm run verify:full      # + coverage + build + secret-scan + e2e
```

## Layout

```
frontend/   Vite + React 19 + TS + Tailwind v3  (client; only VITE_ envs reach the browser)
  src/lib/        pure domain logic (geo seeded; tobler/elevation/gpx/slicing built by the loop)
  src/contracts/  zod schemas for every upstream response
backend/    Express + TS  (secure proxy gateway: /api/route, /api/weather, /healthz)
test/fixtures/    frozen upstream responses (MSW serves these; no live API in tests)
scripts/verify.mjs   the verification gate
docs/       SPEC · DECISIONS · BLOCKED · MANUAL_QA
.claude/agents/   planner · test-author · fixer   (pinned Opus specialists)
```

## The loop

The build is autonomous and disciplined:
- **Sonnet 5** runs `/loop`: reads `TASKS.md`, invokes the specialists, runs the gate,
  commits **only on green**, and keeps the ledger.
- **Opus** subagents plan (`planner`), write failing tests first (`test-author`), and repair
  red gates (`fixer`).
- The gate is real (`scripts/verify.mjs`), hermetic (MSW mocks, no keys, no flake), and
  cannot be weakened to pass. See [`CLAUDE.md`](./CLAUDE.md).

## Configuration & keys

| Variable | Where | Notes |
| --- | --- | --- |
| `VITE_MAPBOX_ACCESS_TOKEN` | client | The only credential in the bundle. URL-restrict it. Free: 50k loads/mo. |
| `ORS_API_KEY` | server | OpenRouteService. Free: 2k/day, 40/min. |
| `OPENWEATHER_API_KEY` | server | One Call 3.0 (card required; set daily cap to 1,000 for $0). |

The autonomous loop never uses real keys — it runs entirely against `test/fixtures/` via
MSW. Real keys are for local/manual runs and staging only.

## Data & attribution

Pathfinder integrates free/open data and **must display attribution** (a shipped, tested
requirement):

- Map & search data © **OpenStreetMap** contributors (ODbL).
- Routing by **openrouteservice** (results CC-BY 4.0).
- Basemap tiles © **Mapbox** (wordmark/attribution required by ToS).
- Radar imagery © **RainViewer**.
- Forecast data © **OpenWeather**.

Licensed under the [MIT License](./LICENSE).
