/**
 * SQL Injection Regression Test
 *
 * This vulnerability was found, fixed, silently regressed during an
 * unrelated refactor, found again, and fixed again earlier in this
 * project's history (see docs/adr/ and the review history for
 * src/providers/postgres.ts's deleteMany()). It's exactly the kind of
 * thing that's easy to reintroduce without noticing, since it lives
 * inside a working, unremarkable-looking loop. This test exists so a
 * regression fails CI instead of waiting for the next manual review.
 *
 * Requires a real, *reachable* Postgres connection — this is a real
 * SQL-syntax check, not something that can be verified against the
 * in-memory provider. Skips (not fails) if POSTGRES_URI isn't set, OR if
 * it's set but unreachable (stale credentials, no network, no local
 * instance) — a connection failure means "can't run this check here," not
 * "the injection guard is broken," and shouldn't block environments
 * without Postgres available.
 */
import 'dotenv/config';
import assert from 'assert';
import { PostgresProvider } from '../../src/providers/postgres.ts';

function isConnectionError(err: any): boolean {
  const code = err?.code || err?.cause?.code;
  return code === 'ECONNREFUSED' || code === 'ENOTFOUND' || code === 'ETIMEDOUT' || code === '28P01' /* auth failure */;
}

async function run() {
  console.log('====================================================');
  console.log('RUNNING SQL INJECTION REGRESSION TEST');
  console.log('====================================================');

  if (!process.env.POSTGRES_URI) {
    console.log('SKIP: POSTGRES_URI not set — this test needs a real Postgres instance.');
    return;
  }

  const provider = new PostgresProvider(process.env.POSTGRES_URI, undefined, 'sql_injection_test_' + Date.now());

  try {
    await provider.init();
  } catch (err: any) {
    if (isConnectionError(err)) {
      console.log(`SKIP: POSTGRES_URI is set but unreachable (${err.code || err.message}) — this test needs a real, reachable Postgres instance.`);
      return;
    }
    throw err;
  }

  // A key containing a single quote and a SQL comment marker. If the key
  // were ever interpolated directly into the query string again (the
  // original bug: `tags->>'${k}' = $${i}`), this would either throw a
  // syntax error or — worse — silently execute injected SQL instead of
  // being treated as an inert bind parameter.
  const maliciousKey = "x' OR '1'='1";
  const maliciousQuery: Record<string, unknown> = { [maliciousKey]: 'anything' };

  try {
    // deleteMany() with zero matching rows (no tags will ever match a key
    // this weird) should complete with 0 deletions — not throw a syntax
    // error, and not delete more than the 0 rows a correctly-parameterized
    // query would ever touch.
    const deleted = await provider.deleteMany(maliciousQuery);
    assert.strictEqual(deleted, 0, 'Expected 0 rows deleted for a key that matches nothing');
    console.log('PASS: malicious tag key was safely parameterized, not interpolated.');
  } catch (err: any) {
    // A thrown error here that references the malicious string directly in
    // a syntax-error message would indicate the key reached the SQL text
    // unescaped — fail loudly so this is never mistaken for an unrelated
    // connection problem.
    if (err.message?.includes(maliciousKey)) {
      throw new Error(`SQL INJECTION REGRESSION: malicious key appears in the driver error, meaning it reached the query text unparameterized: ${err.message}`);
    }
    throw err;
  } finally {
    await provider.close?.();
  }

  console.log('====================================================');
  console.log('SQL INJECTION REGRESSION TEST: PASSED');
  console.log('====================================================');
}

run().catch(err => {
  console.error('SQL INJECTION REGRESSION TEST FAILED:', err.message);
  process.exit(1);
});
