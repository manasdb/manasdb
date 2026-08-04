/**
 * Executable Documentation Test
 *
 * Verifies specific claims made in README.md actually hold, rather than
 * trusting prose to stay in sync with the code. This doesn't (yet) run
 * every code block in the README — the "10-Second Demo" and Quick Start
 * examples call absorb()/recall() with the `transformers` embedding
 * source, which downloads a model from Hugging Face on first use. That
 * needs real network access (and is slow/flaky to depend on for every CI
 * run), so the full absorb → recall round trip is exercised by
 * `tests/integration/test-zero-config.ts` and `test-sdk-ts.ts` in the
 * broader integration matrix instead.
 *
 * What THIS file verifies, safely and without network: the specific,
 * checkable claim in the "10-Second Demo" section — "ManasDB defaults to
 * an in-memory MemoryProvider for zero-config development" — since that's
 * a claim about which provider gets selected, not about embedding output,
 * and is fully verifiable via init() alone.
 *
 * If you add a new README code block that makes a similarly concrete,
 * network-free claim, add a case here rather than trusting it stays true.
 */
import { ManasDB } from '../../src/index.ts';
import { inferTypeFromUri } from '../../src/providers/factory.ts';
import assert from 'assert';

async function run() {
  console.log('====================================================');
  console.log('RUNNING EXECUTABLE DOCUMENTATION TEST');
  console.log('====================================================');

  // README, "10-Second Demo":
  // "ManasDB defaults to an in-memory MemoryProvider for zero-config development."
  const zeroConfig = new ManasDB({ modelConfig: { source: 'transformers' }, telemetry: false });
  await zeroConfig.init();
  const driverNames = zeroConfig.databaseDrivers.map((d: any) => d.constructor.name);
  assert.deepStrictEqual(
    driverNames,
    ['MemoryProvider'],
    `README claims zero-config defaults to MemoryProvider, but got: ${JSON.stringify(driverNames)}`
  );
  console.log('PASS: zero-config (no uri) really does default to MemoryProvider, as documented.');
  await zeroConfig.close();

  // README, Quick Start: `uri: 'memory://'` (used throughout this test
  // suite for CI-safe tests) should resolve to the same provider.
  const explicitMemory = new ManasDB({ uri: 'memory://', modelConfig: { source: 'transformers' }, telemetry: false });
  await explicitMemory.init();
  const explicitDriverNames = explicitMemory.databaseDrivers.map((d: any) => d.constructor.name);
  assert.deepStrictEqual(
    explicitDriverNames,
    ['MemoryProvider'],
    `Expected uri: 'memory://' to resolve to MemoryProvider, got: ${JSON.stringify(explicitDriverNames)}`
  );
  console.log("PASS: uri: 'memory://' resolves to MemoryProvider.");
  await explicitMemory.close();

  // docs/guides/database-setup.md documents three configuration shapes —
  // MongoDB via `uri: process.env.MONGODB_URI`, PostgreSQL via
  // `uri: process.env.POSTGRES_URI`, and Polyglot via a `databases: []`
  // array with explicit `type` fields. All three depend on
  // inferTypeFromUri() correctly classifying the URI scheme — testable
  // directly, without connecting to anything.
  const cases: Array<[string, ReturnType<typeof inferTypeFromUri>]> = [
    ['mongodb+srv://user:pass@cluster.mongodb.net/', 'mongodb'],
    ['postgresql://user:pass@localhost:5432/vectors', 'postgres'],
    ['postgres://user:pass@localhost:5432/vectors', 'postgres'],
    ['redis://localhost:6379', 'redis'],
    ['memory://', 'memory'],
    ['', 'memory'], // zero-config fallback
  ];
  for (const [uri, expectedType] of cases) {
    const actual = inferTypeFromUri(uri);
    assert.strictEqual(
      actual,
      expectedType,
      `Expected inferTypeFromUri(${JSON.stringify(uri)}) to be '${expectedType}', got '${actual}'`
    );
  }
  console.log('PASS: every documented URI scheme (mongodb/postgres/redis/memory) infers the correct provider type.');

  console.log('====================================================');
  console.log('EXECUTABLE DOCUMENTATION TEST: ALL PASSED');
  console.log('====================================================');
}

run().catch(err => {
  console.error('EXECUTABLE DOCUMENTATION TEST FAILED:', err.message);
  process.exit(1);
});
