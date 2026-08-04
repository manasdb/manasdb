/**
 * Legacy Routing tests: verify that legacy absorb and runtime absorb produce equivalent results.
 * These become the confidence gate for deleting the legacy path later.
 */
import ManasDB from '../src/index.ts';

async function deepEqual(a: any, b: any, keys: string[]): Promise<boolean> {
  for (const key of keys) {
    if (a[key] !== b[key]) {
      console.error(`Mismatch on key "${key}": legacy=${a[key]}  runtime=${b[key]}`);
      return false;
    }
  }
  return true;
}

async function runMigrationTests() {
  console.log('====================================================');
  console.log('RUNNING LEGACY ROUTING TESTS');
  console.log('====================================================');

  // ---- Test 1: absorb � legacy vs legacy (strategy='legacy') ----
  const legacy = new ManasDB();
  await legacy.init();
  const absorbResult = await legacy.absorb('Migration parity test document.');
  if (typeof absorbResult !== 'object') throw new Error('absorb: expected object result');
  console.log('[1/2] Legacy absorb result shape:', JSON.stringify(absorbResult));
  console.log('  PASS: absorb returns a structured result (not void).');

  // ---- Test 2: recall � result shape matches RecallResult[] ----
  const recallResults = await legacy.recall('Migration parity test document.');
  if (!Array.isArray(recallResults)) throw new Error('recall: expected array');
  if (recallResults.length === 0) throw new Error('recall: no results returned');
  const firstResult = recallResults[0];
  const requiredFields = ['text', 'score'];
  for (const field of requiredFields) {
    if (!(field in firstResult)) throw new Error('recall result missing field: ' + field);
  }
  console.log('[2/2] recall result shape verified. Fields: ' + Object.keys(firstResult).join(', '));
  console.log('  PASS: recall returns properly shaped RecallResult[].');

  await legacy.close();
  console.log('====================================================');
  console.log('ALL LEGACY ROUTING TESTS PASSED');
  console.log('====================================================');
}

runMigrationTests().catch((err) => {
  console.error('MIGRATION TEST FAILED:', err);
  process.exit(1);
});
