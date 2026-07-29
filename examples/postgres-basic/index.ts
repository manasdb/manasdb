import { ManasDB } from "../../src/index.ts";
import dotenv from "dotenv";
dotenv.config();

const memory = new ManasDB({
  uri: process.env.POSTGRES_URI,
  projectName: "demo",
  modelConfig: { source: "transformers" },
  telemetry: false,
});

await memory.init();

await memory.absorb(`
  PostgreSQL is an advanced open-source relational database.
  The pgvector extension adds support for high-dimensional vector similarity search.
  It supports Euclidean (L2), inner product, and cosine distance operators.
`);

const results = await memory.recall("What distance operators does pgvector support?", {
  limit: 3,
  minScore: 0.1,
} as any);

console.log("\n🔍 Top match:");
console.log(results[0]?.text ?? "No results found");
console.log("\n📊 Score:", results[0]?.score?.toFixed(4));
console.log("🔎 Trace:", (results as any)._trace);

await memory.close();
