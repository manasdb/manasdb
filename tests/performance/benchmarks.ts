/**
 * Benchmark harness — startup, absorb, recall, reasoning, search, batch absorb.
 *
 * Usage:
 *   npm run bench              — run and compare against tests/performance/baseline.json
 *   npm run bench:baseline     — run and overwrite the stored baseline
 *
 * `startup` needs no network (zero-config MemoryProvider). The rest
 * (absorb/recall/reasoning/search/batchAbsorb) need a real embedding call —
 * with the default `transformers` source that means downloading a model
 * from Hugging Face on first run. If that's not reachable (offline CI,
 * sandboxed environment), those five benchmarks are skipped with a clear
 * message rather than failing the whole run — `startup` still completes
 * and still gets compared. This file is intentionally NOT part of
 * `npm run test:safety-net`, since it can't guarantee network-free
 * execution the way every other safety-net test does.
 */
import { ManasDB } from '../../src/index.ts';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASELINE_PATH = path.join(__dirname, 'baseline.json');
const REGRESSION_THRESHOLD = 0.20; // flag anything >20% slower than baseline

type BenchResult = { name: string; ms: number; skipped?: string };

async function timeIt(name: string, fn: () => Promise<void>): Promise<BenchResult> {
  const start = performance.now();
  await fn();
  return { name, ms: performance.now() - start };
}

async function runBenchmarks(): Promise<BenchResult[]> {
  const results: BenchResult[] = [];

  // 1. Startup — construction + init(), zero-config, no network required.
  results.push(await timeIt('startup', async () => {
    const memory = new ManasDB({ modelConfig: { source: 'transformers' }, telemetry: false });
    await memory.init();
    await memory.close();
  }));

  // 2-6. Everything below needs a real embedding call. Try once; if it
  // fails (most likely: no network to fetch the transformers model),
  // record every remaining benchmark as skipped instead of crashing.
  const memory = new ManasDB({ modelConfig: { source: 'transformers' }, telemetry: false, uri: 'memory://' });
  await memory.init();

  let embeddingsAvailable = true;
  try {
    await memory.absorb('Warm-up call to confirm the embedding provider is reachable.');
  } catch (err: any) {
    embeddingsAvailable = false;
    console.warn(`Skipping embedding-dependent benchmarks — embedding provider unavailable: ${err.message}`);
  }

  const skip = (name: string): BenchResult => ({ name, ms: NaN, skipped: 'embedding provider unavailable' });

  if (embeddingsAvailable) {
    results.push(await timeIt('absorb', async () => {
      await memory.absorb('The James Webb Space Telescope launched on December 25, 2021.');
    }));

    results.push(await timeIt('recall', async () => {
      await memory.recall('When did James Webb launch?');
    }));

    results.push(await timeIt('reasoning', async () => {
      await memory.reasoningRecall('When did James Webb launch?', { topSections: 3 });
    }));

    results.push(await timeIt('search', async () => {
      await memory.search('James Webb');
    }));

    results.push(await timeIt('batchAbsorb', async () => {
      await memory.batchAbsorb([
        'Fact one for batch absorb benchmark.',
        'Fact two for batch absorb benchmark.',
        'Fact three for batch absorb benchmark.',
      ]);
    }));
  } else {
    results.push(skip('absorb'), skip('recall'), skip('reasoning'), skip('search'), skip('batchAbsorb'));
  }

  await memory.close();
  return results;
}

function loadBaseline(): Record<string, number> {
  if (!fs.existsSync(BASELINE_PATH)) return {};
  return JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf-8'));
}

function saveBaseline(results: BenchResult[]): void {
  const baseline: Record<string, number> = {};
  for (const r of results) if (!r.skipped) baseline[r.name] = Math.round(r.ms * 100) / 100;
  fs.writeFileSync(BASELINE_PATH, JSON.stringify(baseline, null, 2) + '\n');
  console.log(`Baseline written to ${BASELINE_PATH}`);
}

function compareToBaseline(results: BenchResult[], baseline: Record<string, number>): boolean {
  let regressed = false;
  console.log('\n--- Benchmark Results ---');
  for (const r of results) {
    if (r.skipped) {
      console.log(`  ${r.name.padEnd(14)} SKIPPED (${r.skipped})`);
      continue;
    }
    const prev = baseline[r.name];
    if (prev === undefined) {
      console.log(`  ${r.name.padEnd(14)} ${r.ms.toFixed(2)}ms  (no baseline yet)`);
      continue;
    }
    const delta = (r.ms - prev) / prev;
    const flag = delta > REGRESSION_THRESHOLD ? '  ⚠ REGRESSION' : '';
    console.log(`  ${r.name.padEnd(14)} ${r.ms.toFixed(2)}ms  (baseline ${prev}ms, ${(delta * 100).toFixed(1)}%)${flag}`);
    if (delta > REGRESSION_THRESHOLD) regressed = true;
  }
  console.log('-------------------------\n');
  return regressed;
}

async function main() {
  console.log('====================================================');
  console.log('RUNNING BENCHMARKS');
  console.log('====================================================');

  const results = await runBenchmarks();
  const saveMode = process.argv.includes('--save-baseline');

  if (saveMode) {
    saveBaseline(results);
    return;
  }

  const baseline = loadBaseline();
  const regressed = compareToBaseline(results, baseline);

  if (regressed) {
    console.error(`One or more benchmarks regressed by more than ${REGRESSION_THRESHOLD * 100}% vs baseline.`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('BENCHMARKS FAILED:', err.message);
  process.exit(1);
});
