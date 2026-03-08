import { ManasDB } from "../../src/index.js";
import dotenv from "dotenv";
dotenv.config();

// ── PostgreSQL-only starter ───────────────────────────────────────────────────
// Requires: POSTGRES_URI in .env (auto-detected from prefix)
// Requires: PostgreSQL with the pgvector extension enabled

const memory = new ManasDB({
  uri: process.env.POSTGRES_URI,
  projectName: "demo",
  modelConfig: { source: "transformers" }, // Free local embeddings — no API key needed
  telemetry: false,
});

await memory.init();

// Store a piece of knowledge
await memory.absorb(`
  PostgreSQL is an advanced open-source relational database.
  The pgvector extension adds support for high-dimensional vector similarity search.
  It supports Euclidean (L2), inner product, and cosine distance operators.
`);

// Retrieve an answer
const results = await memory.recall("What distance operators does pgvector support?", {
  limit: 3,
  minScore: 0.1,
});

console.log("\n🔍 Top match:");
console.log(results[0]?.text ?? "No results found");
console.log("\n📊 Score:", results[0]?.score?.toFixed(4));
console.log("🔎 Trace:", results._trace);

await memory.close();
