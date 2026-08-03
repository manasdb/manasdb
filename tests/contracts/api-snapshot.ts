/**
 * API Snapshot Test
 *
 * Not "does absorb() behave correctly" (compat-tests.ts covers that) —
 * this checks the *shape* of the public API itself: the exact set of
 * methods/getters on ManasDB.prototype, compared against a fixed snapshot
 * list below. Unlike tests/contracts/api-contract.ts (which only checks
 * that each expected method exists), this also fails if a method is
 * REMOVED or if a new one is added without updating the snapshot —
 * catching accidental surface changes in either direction, which matters
 * once you've promised the public API is stable (see docs/STABILITY.md).
 *
 * Updating this list is a deliberate, reviewable act — that's the point.
 */
import { ManasDB } from '../../src/index.ts';
import assert from 'assert';

// Methods (including getters) expected on ManasDB.prototype. Keep sorted —
// makes the diff readable when this list needs to change.
const EXPECTED_PROTOTYPE_MEMBERS = [
  'absorb',
  'batchAbsorb',
  'clear',
  'clearTelemetry',
  'close',
  'constructor',
  'databaseDrivers',   // getter
  'debug',             // getter
  'dedup',
  'delete',
  'expireOlderThan',
  'export',
  'forgetMany',
  'getStats',
  'getTelemetry',
  'import',
  'init',
  'list',
  'migrateTo',
  'modelConfig',       // getter
  'piiShieldConfig',   // getter
  'projectName',       // getter
  'reasoningRecall',
  'recall',
  'search',
  'update',
].sort();

// Public instance properties assigned in the constructor (not on the
// prototype — object literals/class instances get these per-instance).
const EXPECTED_INSTANCE_PROPERTIES = ['cognitive', 'system'].sort();

function getPrototypeMemberNames(ctor: Function): string[] {
  return Object.getOwnPropertyNames(ctor.prototype)
    .filter(k => !k.startsWith('_')) // TS `private`/`#`-less fields are still real prototype members at runtime; `_`-prefixed ones (e.g. `_rt`) are internal by convention, not part of the public snapshot
    .sort();
}

function getInstancePropertyNames(instance: object): string[] {
  return Object.getOwnPropertyNames(instance)
    .filter(k => !k.startsWith('_')) // internal fields (e.g. _legacy, _router) are not part of the public snapshot
    .sort();
}

async function run() {
  console.log('====================================================');
  console.log('RUNNING API SNAPSHOT TEST');
  console.log('====================================================');

  const memory = new ManasDB({ uri: 'memory://', telemetry: false });

  const actualPrototypeMembers = getPrototypeMemberNames(ManasDB);
  const actualInstanceProperties = getInstancePropertyNames(memory);

  assert.deepStrictEqual(
    actualPrototypeMembers,
    EXPECTED_PROTOTYPE_MEMBERS,
    `ManasDB.prototype surface changed.\n  expected: ${JSON.stringify(EXPECTED_PROTOTYPE_MEMBERS)}\n  actual:   ${JSON.stringify(actualPrototypeMembers)}\n` +
    `If this is an intentional public API change, update EXPECTED_PROTOTYPE_MEMBERS in this file as part of the same PR.`
  );
  console.log(`PASS: prototype surface matches snapshot (${actualPrototypeMembers.length} members).`);

  assert.deepStrictEqual(
    actualInstanceProperties,
    EXPECTED_INSTANCE_PROPERTIES,
    `ManasDB instance property surface changed.\n  expected: ${JSON.stringify(EXPECTED_INSTANCE_PROPERTIES)}\n  actual:   ${JSON.stringify(actualInstanceProperties)}`
  );
  console.log(`PASS: instance property surface matches snapshot (${actualInstanceProperties.length} properties).`);

  console.log('====================================================');
  console.log('API SNAPSHOT TEST: ALL PASSED');
  console.log('====================================================');
}

run().catch(err => {
  console.error('API SNAPSHOT TEST FAILED:', err.message);
  process.exit(1);
});
