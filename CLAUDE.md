# Pathfinder App — Autonomous Agent Instructions

Pathfinder is a topographic hiking route planner (snap-to-trail routing, Tobler-based
time/elevation, weather + radar, multi-day shelter slicing) that exports GPX to the COROS
Nomad watch. It is built by a **disciplined autonomous loop**. This file is the contract
every agent in that loop obeys. Read it fully before touching code.

The authoritative product spec is **`docs/SPEC.md`**. Resolved decisions are in
**`docs/DECISIONS.md`**. The work ledger is **`TASKS.md`**. When any of those conflict with
your memory of the blueprint, **the files win**.

---

## 1. The loop model — who does what

Sonnet 5 **drives** the loop; Opus **plans, writes tests, and fixes**. The split is
mechanical, via pinned subagents in `.claude/agents/`:

| Role | Agent | Model | Responsibility |
| --- | --- | --- | --- |
| Driver | (the `/loop` session) | Sonnet 5 | Orchestrate: read `TASKS.md`, invoke the specialists in order, run the gate, commit on green, keep the ledger. Never writes speculative production code. |
| Planner | `.claude/agents/planner.md` | Opus | Decompose the next `TASKS.md` item into subtasks + an explicit Definition-of-Done + the exact verify command. |
| Test author | `.claude/agents/test-author.md` | Opus | Write **failing** tests FIRST, against the frozen fixtures + zod contracts, before implementation. |
| Fixer | `.claude/agents/fixer.md` | Opus | Invoked whenever `verify:fast` goes red. Diagnose and repair. Max 3 attempts per failure, then escalate. |

**Driver cycle for one task:**
1. Read `TASKS.md`; pick the first unchecked task whose dependencies are met.
2. Invoke **planner** → get subtasks, DoD, verify command.
3. Invoke **test-author** → failing tests that encode the DoD.
4. Implement the minimum to satisfy the tests.
5. Run `npm run verify:fast`. If red → invoke **fixer** (≤3 attempts).
6. On green → **one** conventional commit, tick the `TASKS.md` box, append an ADR to
   `docs/DECISIONS.md` if you resolved any spec ambiguity.
7. At a phase boundary, run `npm run verify:full` and require CI green before advancing.

State is reconstructed only from **git history + `TASKS.md`**, never from chat memory. A
cold session resumes at the last green commit.

---

## 2. Commands (the only ones that matter)

```bash
npm run bootstrap      # npm ci across workspaces (clean, lockfile-exact install)
npm run dev            # Vite (5173) + Express gateway (8080) concurrently
npm run build          # frontend (tsc+vite) then backend (tsc)
npm run verify:fast    # format → lint → typecheck → unit         (inner loop, seconds)
npm run verify:full    # + coverage + build + secret-scan + e2e   (phase gate / CI)
npm test               # vitest run
npm run lint           # eslint .            (the gate runs it with --max-warnings=0)
npm run typecheck      # tsc --noEmit, both workspaces
npm run format         # prettier --write .
```

`npm run verify:fast` is the signal you trust. If it is green, the task is done; if it is
red, the task is not done. There is no third state.

---

## 3. Non-negotiable invariants

1. **Server secrets never reach the client.** `ORS_API_KEY` and `OPENWEATHER_API_KEY` live
   only in the backend (`backend/src/config.ts`) and are injected by the proxy. The ONLY
   credential allowed in the browser bundle is `VITE_MAPBOX_ACCESS_TOKEN`. The
   `secret-scan` stage enforces this every full run.
2. **No live network in tests.** All upstreams are mocked with MSW (`onUnhandledRequest:
   'error'`) using the frozen fixtures in `test/fixtures/`. A test that opens a real socket
   is a bug. The loop has **no API keys** — do not attempt to obtain or use them.
3. **ORS is the single source of truth for elevation** (via `/foot-hiking/geojson`). Do not
   reintroduce a Mapbox Terrain-RGB elevation path (ADR-003). A raster-DEM is allowed only
   for optional 3D hillshade, never blended into the profile numbers.
4. **Pinned constants are law.** Tobler params, the γ surface table, sampling params, and
   zoom thresholds live in `frontend/src/lib/constants.ts` with CONFIRM notes. Do not guess
   or silently change them; if a human confirms a source-image value, change the constant
   **and** its test together.
5. **GPX is real GPX 1.1** — fully namespaced root, correct child ordering, `<ele>` before
   `<time>` (omit `<time>` for a planned course). Validate against the XSD in tests, not by
   substring match.
6. **Custom UI only** — no `window.alert/confirm/prompt`. Errors surface as Radix toasts.
7. **Attribution is a shipped feature** — OSM + Mapbox + ORS + RainViewer credit must be
   visible; it is a testable acceptance criterion, not a nicety.

---

## 4. DO / DON'T

**DO**
- Write tests first for every pure function (`src/lib/**`). Keep them pure and exhaustive;
  `geo.ts` is the reference style.
- Validate every external response with its zod contract (`src/contracts/**`) so malformed
  payloads fail loudly.
- Keep commits atomic: one green task per conventional commit
  (`feat:`, `fix:`, `test:`, `chore:`…).
- Stay strictly in the scope of the current `TASKS.md` item.

**DON'T**
- ❌ Weaken the gate to get green: no `test.skip`/`it.only`/`xit`, no `eslint-disable` to
  silence a real error, no lowering coverage thresholds, no `--no-verify`, no deleting or
  editing a fixture to make a test pass.
- ❌ Commit with a red `verify:fast`.
- ❌ Introduce a second elevation source, hardcode a secret, or call a live API in a test.
- ❌ Add heavy dependencies or restructure the architecture without an ADR in
  `docs/DECISIONS.md`.

---

## 5. Stop conditions (when the loop must halt, not thrash)

- **Commit only on green.** Never advance a phase while its `verify:full` gate is red.
- **3-strikes rule.** After 3 consecutive identical failures on the same task, stop, write
  the diagnosis to `docs/BLOCKED.md`, and end the turn for a human. Do not keep rewriting
  the same files.
- **Scope guard.** If a task turns out to require a large refactor or an unresolved product
  decision, stop and record it in `docs/BLOCKED.md` rather than improvising.
- **Determinism required.** If a test is flaky, treat the flakiness as the bug: pin time
  (`TZ=UTC`, `vi.useFakeTimers()` for the 500 ms debounce), seed randomness, ensure MSW
  covers every request. A flaky gate is a broken gate.
- **Un-automatable checks are not loop gates.** Real COROS device import and the Android
  share intent live in `docs/MANUAL_QA.md` and are verified by a human, never faked green.

---

## 6. Architecture quick map

```
frontend/  Vite + React 19 + TS + Tailwind v3   (client, VITE_ envs only)
  src/lib/        pure domain logic (tobler, elevation, gpx, slicing) — test-first
  src/contracts/  zod schemas for every upstream response
backend/   Express + TS   (the secure proxy gateway; /api/route, /api/weather, /healthz)
test/fixtures/   frozen upstream responses (MSW serves these)
scripts/verify.mjs   the gate
docs/      SPEC.md · DECISIONS.md · BLOCKED.md · MANUAL_QA.md
```

Deployment target: **Google Cloud Run**, single fixed custom domain (secrets via Secret
Manager; the Mapbox token is URL-restricted to that one origin). Scope: **single-user
private** (no auth/DB; plans autosave to localStorage). Mobile: **Capacitor** for the
native GPX share to COROS, with a plain `.gpx` download as the web/desktop fallback.
