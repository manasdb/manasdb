import { ManasDB } from "../../src/index.ts";
import dotenv from "dotenv";
dotenv.config();

const memory = new ManasDB({
  databases: [
    { type: "mongodb",  uri: process.env.MONGODB_URI, dbName: "polyglot_demo" },
    { type: "postgres", uri: process.env.POSTGRES_URI },
  ],
  projectName: "demo_polyglot",
  modelConfig: { source: "transformers" },
  telemetry: true,
  piiShield: true,
  debug: false,
});

await memory.init();

await memory.absorb(`
  Retrieval-Augmented Generation (RAG) grounds language model outputs in external knowledge.
  It retrieves relevant documents, then injects them as context before generation.
  RAG reduces hallucination by anchoring responses to verifiable facts.
`);

const results = await memory.recall("How does RAG reduce hallucination?", {
  limit: 3,
  minScore: 0.05,
} as any);

console.log(`\n🌐 Polyglot results from ${results.length} unique chunk(s):\n`);
for (const r of results) {
  console.log(`  [${r.database.toUpperCase()}] score=${r.score.toFixed(4)}`);
  console.log(`  ${r.text.slice(0, 120)}...\n`);
}

console.log("🔎 Pipeline trace:", (results as any)._trace);

const health = await memory.health();
console.log("\n❤️  Provider health:", health);

await memory.close();
