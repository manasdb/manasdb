import { ManasDB } from "../../src/index.js";
import dotenv from "dotenv";
dotenv.config();

// ── MongoDB-only starter ──────────────────────────────────────────────────────
// Requires: MONGODB_URI in .env (auto-detected from prefix)

const memory = new ManasDB({
  uri: process.env.MONGODB_URI,
  dbName: "my_ai_app",
  projectName: "demo",
  modelConfig: { source: "transformers" }, // Free local embeddings — no API key needed
  telemetry: false,
});

await memory.init();

// Store a piece of knowledge
await memory.absorb(`
  The James Webb Space Telescope launched on December 25, 2021.
  It observes the universe in infrared light.
  Its mirror is 6.5 metres wide, made of gold-plated beryllium.
`);

// Retrieve an answer
const results = await memory.recall("What is the Webb telescope's mirror made of?", {
  limit: 3,
  minScore: 0.1,
});

console.log("\n🔍 Top match:");
console.log(results[0]?.text ?? "No results found");
console.log("\n📊 Score:", results[0]?.score?.toFixed(4));
console.log("🔎 Trace:", results._trace);

await memory.close();
