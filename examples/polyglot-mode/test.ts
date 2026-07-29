import { ManasDB } from "../../src/index.ts";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { resolve, dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../.env") });

if (!process.env.MONGODB_URI || !process.env.POSTGRES_URI) {
  console.error("❌  Both MONGODB_URI and POSTGRES_URI must be set in .env at the repo root.");
  process.exit(1);
}

const RUN_ID = Date.now();
let passed = 0, total = 0;

const assert = (condition: boolean, msg: string) => {
  total++;
  if (condition) {
    console.log(`  ✅ PASS — ${msg}`);
    passed++;
  } else {
    console.log(`  ❌ FAIL — ${msg}`);
  }
};

console.log("\n══════════════════════════════════════════════════");
console.log("  polyglot-mode / test.ts");
console.log("══════════════════════════════════════════════════\n");

const memory = new ManasDB({
  databases: [
    { type: "mongodb",  uri: process.env.MONGODB_URI, dbName: "manasdb_poly_test" },
    { type: "postgres", uri: process.env.POSTGRES_URI },
  ],
  projectName: `test_polyglot_${RUN_ID}`,
  modelConfig: { source: "transformers" },
  telemetry: false,
  piiShield: true,
});

console.log("Test 1: init() with 2 providers");
try {
  await memory.init();
  assert(true, "init() completed without error");
  assert(memory.databaseDrivers.length === 2, `2 drivers mounted (got ${memory.databaseDrivers.length})`);
  const names = memory.databaseDrivers.map(d => d.constructor.name);
  assert(names.includes("MongoProvider"),    "MongoProvider is mounted");
  assert(names.includes("PostgresProvider"), "PostgresProvider is mounted");
} catch (e: any) {
  assert(false, `init() threw: ${e.message}`);
  process.exit(1);
}

console.log("\nTest 2: absorb() broadcasts to 2 databases");
const TEXT = `Retrieval-Augmented Generation (RAG) grounds language model outputs in
external knowledge by retrieving relevant documents and injecting them as
context before generation. This reduces hallucination significantly.`;

const res = await memory.absorb(TEXT);
assert(Array.isArray(res.inserted), "result.inserted is an array");
assert(res.inserted.length === 2, `absorb broadcast to 2 DBs (got ${res.inserted.length})`);

const databases = res.inserted.map((i: any) => i.database);
assert(databases.includes("mongodb"),  "MongoDB received the insert");
assert(databases.includes("postgres"), "PostgreSQL received the insert");
assert(Number.isInteger(res.chunks) && res.chunks > 0, `chunks > 0 (got ${res.chunks})`);

console.log("\nTest 3: PII Shield");
const piiRes = await memory.absorb(
  "Contact john.doe@example.com or call (800) 555-0199 for support."
);
assert(piiRes.inserted.length === 2, "PII-shielded text absorbed into both DBs");

console.log("\nTest 4: polyglot recall() — merge & dedup");
await new Promise(r => setTimeout(r, 3000));

const results = await memory.recall("How does RAG reduce hallucination?", {
  limit: 5,
  minScore: 0.05,
} as any);
assert(Array.isArray(results), "recall() returns an array");
assert(results.length > 0, `recall() returns ≥ 1 result (got ${results.length})`);

const allNormalized = results.every((r: any) => typeof r.score === "number" && r.score >= 0 && r.score <= 1);
assert(allNormalized, "All polyglot scores are normalized to [0,1]");

const isDescending = results.every((item: any, i: number) => i === 0 || results[i - 1].score >= item.score);
assert(isDescending, "Polyglot results are sorted by score descending");

const allHaveDb = results.every((r: any) => r.database === "mongodb" || r.database === "postgres");
assert(allHaveDb, "Every result carries a database field (mongodb or postgres)");

console.log("\nTest 5: deduplication across providers");
const texts = results.map((r: any) => r.text);
const uniqueTexts = new Set(texts);
assert(uniqueTexts.size === texts.length, "No duplicate text in merged polyglot results");

console.log("\nTest 6: semantic cache");
const q = "What is RAG?";
await memory.recall(q, { limit: 3 } as any);
const cached = await memory.recall(q, { limit: 3 } as any);
assert(!!(cached as any)._trace?.cacheHit, "Second identical recall is a cache hit");

console.log("\nTest 7: health()");
const health = await memory.health();
assert(Array.isArray(health), "health() returns an array");
assert(health.length === 2, `health() reports 2 providers (got ${health.length})`);
const allOk = health.every((h: any) => h.status === "OK");
assert(allOk, `All providers healthy: ${JSON.stringify(health)}`);

console.log("\nTest 8: close()");
try {
  await memory.close();
  assert(true, "close() completed without error");
} catch (e: any) {
  assert(false, `close() threw: ${e.message}`);
}

console.log("\n══════════════════════════════════════════════════");
console.log(`  Results: ${passed}/${total} passed`);
console.log("══════════════════════════════════════════════════\n");
process.exit(passed === total ? 0 : 1);
