/**
 * Test suite for the postgres-basic example.
 * Run: node test.js
 */
import { ManasDB } from "../../src/index.js";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { resolve, dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../.env") });

if (!process.env.POSTGRES_URI) {
  console.error("❌  POSTGRES_URI not set. Add it to .env at the repo root.");
  process.exit(1);
}

const RUN_ID = Date.now();
let passed = 0, total = 0;

const assert = (condition, msg) => {
  total++;
  if (condition) {
    console.log(`  ✅ PASS — ${msg}`);
    passed++;
  } else {
    console.log(`  ❌ FAIL — ${msg}`);
  }
};

console.log("\n══════════════════════════════════════════════════");
console.log("  postgres-basic / test.js");
console.log("══════════════════════════════════════════════════\n");

// ── Setup ─────────────────────────────────────────────────────────────────────
const memory = new ManasDB({
  uri: process.env.POSTGRES_URI,
  projectName: `test_pg_basic_${RUN_ID}`,
  modelConfig: { source: "transformers" },
  telemetry: false,
});

// ── 1. init() must not throw ──────────────────────────────────────────────────
console.log("Test 1: init()");
try {
  await memory.init();
  assert(true, "init() completed without error");
} catch (e) {
  assert(false, `init() threw: ${e.message}`);
  process.exit(1);
}

// ── 2. absorb() returns expected shape ───────────────────────────────────────
console.log("\nTest 2: absorb()");
const res = await memory.absorb(
  `PostgreSQL is an advanced open-source relational database.
   The pgvector extension adds vector similarity search to PostgreSQL.
   It supports cosine, Euclidean (L2), and inner product distance operators.`
);
assert(typeof res === "object", "absorb() returns an object");
assert(Array.isArray(res.inserted), "result.inserted is an array");
assert(res.inserted.length === 1, "result.inserted has 1 entry (Postgres)");
assert(res.inserted[0].database === "postgres", `inserted.database = "postgres"`);
assert(Number.isInteger(res.chunks) && res.chunks > 0, `chunks > 0 (got ${res.chunks})`);
assert(res.contentId !== undefined, "contentId is set");

// ── 3. recall() returns ranked results with normalized scores ─────────────────
console.log("\nTest 3: recall()");
const results = await memory.recall("What distance operators does pgvector support?", {
  limit: 3,
  minScore: 0.05,
});
assert(Array.isArray(results), "recall() returns an array");
assert(results.length > 0, `recall() returns ≥ 1 result (got ${results.length})`);
assert(typeof results[0].score === "number", "result[0].score is a number");
assert(results[0].score >= 0 && results[0].score <= 1, `score is in [0,1] (got ${results[0].score.toFixed(4)})`);
assert(typeof results[0].text === "string" && results[0].text.length > 0, "result[0].text is non-empty");
assert(results[0].database === "postgres", `result[0].database = "postgres"`);

// ── 4. Deduplication — absorbing the same text twice should return the same contentId ──
console.log("\nTest 4: deduplication");
const TEXT = "pgvector enables vector similarity search inside PostgreSQL natively.";
const r1 = await memory.absorb(TEXT);
const r2 = await memory.absorb(TEXT);
assert(
  String(r1.contentId) === String(r2.contentId),
  `Same content produces same contentId (${r1.contentId})`
);

// ── 5. Semantic cache ─────────────────────────────────────────────────────────
console.log("\nTest 5: semantic cache");
const q = "What is pgvector?";
await memory.recall(q, { limit: 2 });
const cached = await memory.recall(q, { limit: 2 });
assert(cached._trace?.cacheHit === true, "Second identical recall is a cache hit");

// ── 6. close() ────────────────────────────────────────────────────────────────
console.log("\nTest 6: close()");
try {
  await memory.close();
  assert(true, "close() completed without error");
} catch (e) {
  assert(false, `close() threw: ${e.message}`);
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log("\n══════════════════════════════════════════════════");
console.log(`  Results: ${passed}/${total} passed`);
console.log("══════════════════════════════════════════════════\n");
process.exit(passed === total ? 0 : 1);
