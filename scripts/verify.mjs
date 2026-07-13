#!/usr/bin/env node
/**
 * Pathfinder verification gate — the loop's single, deterministic feedback signal.
 *
 * This REPLACES the blueprint's `verify_build.js` (which only stat'd a file, matched a
 * hardcoded string, and transpiled the frontend). Stages run cheapest-first and fail
 * loud; a machine-readable summary is written to `verify-result.json`.
 *
 *   node scripts/verify.mjs           # fast (default): the tight inner loop
 *   node scripts/verify.mjs --fast    # format → lint → typecheck → unit
 *   node scripts/verify.mjs --full    # + coverage + build + secret-scan + e2e  (phase gate / CI)
 *   node scripts/verify.mjs --full --no-fail-fast   # run every stage, report all failures
 *
 * A stage may SKIP itself when its inputs don't exist yet (e.g. no e2e specs). Skips are
 * reported explicitly — a skipped stage is never counted as a pass. The loop MUST NOT
 * weaken this file to make a task pass; see CLAUDE.md.
 */
import { execSync } from 'node:child_process';
import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const args = new Set(process.argv.slice(2));
const mode = args.has('--full') ? 'full' : 'fast';
const failFast = !args.has('--no-fail-fast');
const ROOT = process.cwd();

function sh(cmd) {
  execSync(cmd, { stdio: 'inherit', cwd: ROOT });
}

function e2eSpecsExist() {
  const dir = join(ROOT, 'e2e');
  if (!existsSync(dir)) return false;
  return readdirSync(dir).some((f) => /\.(spec|test)\.ts$/.test(f));
}

/** Scan the built frontend bundle: no server secret may ever be embedded client-side. */
function secretScan() {
  const dist = join(ROOT, 'frontend', 'dist');
  if (!existsSync(dist)) {
    throw new Error('frontend/dist missing — run the build stage before secret-scan.');
  }
  // Grep the bundle for forbidden server-key identifiers. VITE_MAPBOX_ACCESS_TOKEN is the
  // ONLY credential allowed in the client. `grep -r` exits 1 when nothing matches (good).
  const forbidden = ['ORS_API_KEY', 'OPENWEATHER_API_KEY'];
  for (const needle of forbidden) {
    let found = '';
    try {
      found = execSync(`grep -rl "${needle}" frontend/dist || true`, {
        cwd: ROOT,
        encoding: 'utf-8',
      }).trim();
    } catch {
      found = '';
    }
    if (found) {
      throw new Error(`Server secret identifier "${needle}" leaked into the bundle:\n${found}`);
    }
  }
  // A real .env must never be tracked by git (only .env.example).
  const tracked = execSync('git ls-files .env', { cwd: ROOT, encoding: 'utf-8' }).trim();
  if (tracked) {
    throw new Error('.env is tracked by git — it must be gitignored.');
  }
}

function buildStages() {
  const unit =
    mode === 'full'
      ? { name: 'unit+coverage', run: () => sh('npx vitest run --coverage') }
      : { name: 'unit', run: () => sh('npx vitest run') };

  const stages = [
    { name: 'format', run: () => sh('npm run format:check') },
    { name: 'lint', run: () => sh('npm run lint -- --max-warnings=0') },
    { name: 'typecheck', run: () => sh('npm run typecheck') },
    unit,
  ];

  if (mode === 'full') {
    stages.push(
      { name: 'build', run: () => sh('npm run build') },
      { name: 'secret-scan', run: secretScan },
      {
        name: 'e2e',
        skip: () => (e2eSpecsExist() ? false : 'no e2e specs yet'),
        run: () => sh('npx playwright test'),
      },
    );
  }
  return stages;
}

console.log(`\n🔎 Pathfinder verify — mode=${mode}, failFast=${failFast}\n`);

const results = [];
let failed = false;

for (const stage of buildStages()) {
  const skipReason = stage.skip ? stage.skip() : false;
  if (skipReason) {
    console.log(`⏭️  ${stage.name}: SKIPPED (${skipReason})`);
    results.push({ name: stage.name, status: 'skip', reason: skipReason, durationMs: 0 });
    continue;
  }
  const start = Date.now();
  console.log(`\n▶️  ${stage.name} …`);
  try {
    stage.run();
    const durationMs = Date.now() - start;
    console.log(`✅ ${stage.name} (${durationMs} ms)`);
    results.push({ name: stage.name, status: 'pass', durationMs });
  } catch (err) {
    const durationMs = Date.now() - start;
    console.error(`❌ ${stage.name} FAILED (${durationMs} ms): ${err.message ?? err}`);
    results.push({ name: stage.name, status: 'fail', durationMs });
    failed = true;
    if (failFast) break;
  }
}

const summary = {
  mode,
  ok: !failed,
  stages: results,
};
writeFileSync(join(ROOT, 'verify-result.json'), JSON.stringify(summary, null, 2));

console.log('\n──────── verify summary ────────');
for (const r of results) {
  const mark = r.status === 'pass' ? '✅' : r.status === 'skip' ? '⏭️ ' : '❌';
  console.log(
    `${mark} ${r.name.padEnd(16)} ${r.status}${r.durationMs ? ` (${r.durationMs} ms)` : ''}`,
  );
}
console.log('────────────────────────────────');

if (failed) {
  console.error('\n💥 verify FAILED — do not commit. Fix the red stage above.\n');
  process.exit(1);
}
console.log('\n🎉 verify PASSED.\n');
process.exit(0);
