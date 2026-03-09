/**
 * Test suite for the mongodb-basic example.
 * Run: node test.js
 */
import { ManasDB } from "../../src/index.js";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { resolve, dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../.env") });

if (!process.env.MONGODB_URI) {
  console.error("❌  MONGODB_URI not set. Add it to .env at the repo root.");
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
console.log("  mongodb-basic / test.js");
console.log("══════════════════════════════════════════════════\n");

// ── Setup ─────────────────────────────────────────────────────────────────────
const memory = new ManasDB({
  uri: process.env.MONGODB_URI,
  dbName: "manasdb_example_test",
  projectName: `test_mongo_basic_${RUN_ID}`,
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
  `The James Webb Space Telescope (JWST) launched on December 25 2021.
   Its primary mirror is 6.5 metres wide and made of gold-plated beryllium.
   It observes the universe in infrared light.`
);
assert(typeof res === "object", "absorb() returns an object");
assert(Array.isArray(res.inserted), "result.inserted is an array");
assert(res.inserted.length === 1, "result.inserted has 1 entry (MongoDB)");
assert(res.inserted[0].database === "mongodb", `inserted.database = "mongodb"`);
assert(Number.isInteger(res.chunks) && res.chunks > 0, `chunks > 0 (got ${res.chunks})`);
assert(res.contentId !== undefined, "contentId is set");

// ── 3. recall() returns ranked results with normalized scores ─────────────────
console.log("\nTest 3: recall()");
// Small delay to let Atlas index the freshly inserted vectors
await new Promise(r => setTimeout(r, 3000));

const results = await memory.recall("What is JWST's mirror made of?", {
  limit: 3,
  minScore: 0.05,
});
assert(Array.isArray(results), "recall() returns an array");
assert(results.length > 0, `recall() returns ≥ 1 result (got ${results.length})`);
assert(typeof results[0].score === "number", "result[0].score is a number");
assert(results[0].score >= 0 && results[0].score <= 1, `score is in [0,1] (got ${results[0].score.toFixed(4)})`);
assert(typeof results[0].text === "string" && results[0].text.length > 0, "result[0].text is non-empty");
assert(results[0].metadata?.matchedChunk?.length > 0, "result[0].metadata.matchedChunk is populated");

// ── 4. Semantic cache — second identical query should be a cache hit ──────────
console.log("\nTest 4: semantic cache");
const r2 = await memory.recall("What is JWST's mirror made of?", { limit: 3, minScore: 0.05 });
assert(r2._trace?.cacheHit === true, "Second identical recall hits the semantic cache");

// ── 5. Score ordering — results must be sorted descending ────────────────────
console.log("\nTest 5: score ordering");
const r3 = await memory.recall("infrared telescope", { limit: 5, minScore: 0.01 });
const isDescending = r3.every((item, i) => i === 0 || r3[i - 1].score >= item.score);
assert(isDescending, "Results are sorted by score descending");

// ── 6. close() must not throw ─────────────────────────────────────────────────
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
