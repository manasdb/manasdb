import { ManasDB } from "../../src/index.js";
import dotenv from "dotenv";
dotenv.config();

// ── Polyglot starter (MongoDB + PostgreSQL simultaneously) ────────────────────
// Requires: MONGODB_URI + POSTGRES_URI in .env
// ManasDB writes to BOTH databases and merges results on recall.

const memory = new ManasDB({
  databases: [
    { type: "mongodb",  uri: process.env.MONGODB_URI, dbName: "polyglot_demo" },
    { type: "postgres", uri: process.env.POSTGRES_URI },
  ],
  projectName: "demo_polyglot",
  modelConfig: { source: "transformers" }, // Free local embeddings
  telemetry: true,  // Logs to _manas_telemetry in both DBs
  piiShield: true,  // Redacts PII before storage
  debug: false,
});

await memory.init();

// Absorb is broadcast to BOTH databases simultaneously
await memory.absorb(`
  Retrieval-Augmented Generation (RAG) grounds language model outputs in external knowledge.
  It retrieves relevant documents, then injects them as context before generation.
  RAG reduces hallucination by anchoring responses to verifiable facts.
`);

// Recall merges results from both DBs, deduplicates, and ranks by score
const results = await memory.recall("How does RAG reduce hallucination?", {
  limit: 3,
  minScore: 0.05,
});

console.log(`\n🌐 Polyglot results from ${results.length} unique chunk(s):\n`);
for (const r of results) {
  console.log(`  [${r.database.toUpperCase()}] score=${r.score.toFixed(4)}`);
  console.log(`  ${r.text.slice(0, 120)}...\n`);
}

console.log("🔎 Pipeline trace:", results._trace);

// Check health of all providers
const health = await memory.health();
console.log("\n❤️  Provider health:", health);

await memory.close();
