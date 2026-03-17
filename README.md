<div align="center">

<a href="https://www.npmjs.com/package/@manasdb/core"><img src="https://img.shields.io/npm/v/@manasdb/core?style=for-the-badge&logo=npm" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/package/@manasdb/core"><img src="https://img.shields.io/npm/dw/@manasdb/core?style=for-the-badge&logo=npm&label=Weekly%20Downloads" alt="Weekly Downloads" /></a>
<a href="https://www.npmjs.com/package/@manasdb/core"><img src="https://img.shields.io/npm/dt/@manasdb/core?style=for-the-badge&logo=npm&label=Total%20Downloads" alt="Total Downloads" /></a>
<a href="https://github.com/manasdb/manasdb/stargazers"><img src="https://img.shields.io/github/stars/manasdb/manasdb?style=for-the-badge&logo=github" alt="GitHub Stars" /></a>
<img src="https://img.shields.io/badge/License-Apache%202.0%20%2B%20Commons%20Clause-blue?style=for-the-badge" />
<img src="https://img.shields.io/badge/Node.js-%3E=18.0-green?style=for-the-badge&logo=nodedotjs" />
<img src="https://img.shields.io/badge/MongoDB-Atlas-blue?style=for-the-badge&logo=mongodb" />
<img src="https://img.shields.io/badge/PostgreSQL-pgvector-blue?style=for-the-badge&logo=postgresql" />
<img src="https://img.shields.io/badge/Models-OpenAI%20%7C%20Gemini%20%7C%20Ollama%20%7C%20Local-lightgrey?style=for-the-badge" />

<br /><br />

# 🧠 ManasDB

### The Memory Layer for AI Applications

> Built alone, without funding — because every developer I know
> was rebuilding the same fragile RAG pipeline from scratch. There
> had to be a better way.

**ManasDB is the Node.js-native alternative to Mem0** — with local
embeddings, full data privacy, 29x faster repeated queries, and
MCP-native integration out of the box.

No cloud lock-in. No API key required to start. Your data never
leaves your server.

[Getting Started](#-quick-start) · [Architecture](#-architecture) · [API Reference](#-api-reference) · [Benchmark](#-benchmark) · [Telemetry](#-telemetry) · [Roadmap](#-roadmap) · [CLI](#-cli-tool) · [Discussions](https://github.com/manasdb/manasdb/discussions) · [License](#-license)

</div>

> ⭐ **If you find ManasDB useful, please [star the repo](https://github.com/manasdb/manasdb) — it helps other developers discover it.**

---

## ⚡ 10-Second Demo

```javascript
import { ManasDB } from "@manasdb/core";

const memory = new ManasDB({ uri: process.env.MONGODB_URI });
await memory.init();

await memory.absorb("Paris is the capital of France.");

const result = await memory.recall("What is the capital of France?");
console.log(result[0].metadata.matchedChunk);
// → "Paris is the capital of France."
```

> That's it. ManasDB defaults to an in-memory `MemoryProvider` for zero-config development. Swap `MONGODB_URI` for `POSTGRES_URI` for production. Pass both in a `databases: []` array for polyglot mode.

---

## 🚀 Moving to Production

While zero-config is great for prototypes, the **MemoryProvider** has limits:

- **Volatility**: Data is lost on restart.
- **Scale**: Performance degrades above 5,000 vectors.
- **Deduplication**: SHA256-based (content-only).

To move to production, simply provide a persistent database URI:

```javascript
const memory = new ManasDB({
  uri: process.env.MONGODB_URI,
  retry: { attempts: 3, backoff: 1000 }, // Recommended for prod
});
```

See [Failure Modes & Recovery](docs/PLAN_13_FAILURE_MODES.md) for advanced resilience patterns.

---

## 💡 Why ManasDB Exists

Most RAG stacks today look like this:

```
Application
    ↓
LangChain / LlamaIndex
    ↓
Vector Database (ANN only)
    ↓
Embedding API
```

Vector databases only provide ANN search. **Everything else** — reranking, hybrid search, deduplication, caching, cost tracking, PII filtering — must be bolted on manually, making each project a fragile snowflake.

ManasDB moves that retrieval intelligence **into the storage layer itself**:

```
Application
    ↓
ManasDB SDK  ←── Cache · Tree Reasoning · PII Shield · Telemetry · Budgeting
    ├── Tier 1 Redis (Semantic Cache)
    └── Tier 2 In-Memory LRU (Semantic Cache)
    └── Budget Guardrails (Monthly USD Caps)
    └── Model Dimension Lock (Anti-Corruption)
    └── Built-in Vector Normalization (Parity)
```

    ├── MongoDB Atlas  ($vectorSearch + full-text)
    └── PostgreSQL     (pgvector + tsvector)

````

The result: **better accuracy, fewer services, lower cost, fully auditable pipelines** — without rewriting your application.

---

## 🆚 ManasDB vs Mem0

| Feature          | Mem0                 | ManasDB                        |
| ---------------- | -------------------- | ------------------------------ |
| Language         | Python-first         | Node.js native ✅              |
| Local embeddings | ✗                    | ✅ Ollama / Transformers       |
| Data privacy     | Sends to their cloud | Stays on your server ✅        |
| MCP native       | Partial              | ✅ Working today               |
| Hybrid search    | Limited              | ✅ RRF + MMR built-in          |
| Redis caching    | ✗                    | ✅ Up to 50x+ faster repeated queries |
| Tree Reasoning   | ✗                    | ✅ Native reasoningRecall()    |
| PII protection   | ✗                    | ✅ Built-in per-field          |
| Trace debugging  | ✗                    | ✅ Every recall()              |
| Telemetry        | Sends to their cloud | Your DB only ✅                |

## 🤝 Works alongside LangChain / LlamaIndex

ManasDB operates at the **storage layer**, not the application layer.
LangChain and LlamaIndex are excellent for chaining LLM calls and
routing agents — ManasDB is the memory backend that plugs into them.
They're complementary, not competing.

---

## 🌐 Why Use Multiple Databases?

Polyglot broadcasting — writing to both MongoDB and PostgreSQL simultaneously — isn't about redundancy for its own sake. Real-world use cases include:

| Scenario                          | How Polyglot Helps                                    |
| --------------------------------- | ----------------------------------------------------- |
| **Database Migration**            | Run both in parallel; flip traffic when confident     |
| **Cross-Region Replication**      | Mongo Atlas in US-East, Postgres in EU-West for GDPR  |
| **Hybrid Storage Strategy**       | Hot semantic data on Mongo, cold archival on Postgres |
| **Retrieval Engine Benchmarking** | Query both, compare scores, decide which to keep      |
| **Disaster Recovery**             | One provider down → SDK falls back to the other       |

For single-database deployments a single `uri` is enough — multi-DB is opt-in.

---

## 🔌 MCP Integration (Claude Desktop & Cursor)

Give Claude Desktop or Cursor **permanent memory** across all conversations in 60 seconds:

```bash
npx @manasdb/mcp-server setup
````

→ See [@manasdb/mcp-server](https://github.com/manasdb/mcp-server) for full Claude Desktop + Cursor setup guide.

### 🚀 Hello World (30-Second Bootstrap)

Try ManasDB in your terminal right now with **zero configuration**. No database, no environment variables, and no API keys required.

```bash
npm install @manasdb/core
```

```javascript
import { ManasDB } from "@manasdb/core";

const memory = new ManasDB({}); // Default: In-memory storage + local embeddings
await memory.init();

await memory.absorb("ManasDB is a Node.js-native memory layer.");
const [result] = await memory.recall("What is ManasDB?");

console.log(result.text);
// → "ManasDB is a Node.js-native memory layer."
```

> **How it works**: By passing an empty config, ManasDB automatically boots with a `MemoryProvider` (volatile) and `transformers` (local CPU embeddings).

---

## 🚀 Quick Start

### Quickest Start (No API Key Needed)

Use local embeddings + a free MongoDB Atlas cluster:

```bash
npm install @manasdb/core mongodb
```

```javascript
import { ManasDB } from "@manasdb/core";

// Free local embeddings — no API key required
const memory = new ManasDB({
  uri: process.env.MONGODB_URI,
  modelConfig: { source: "transformers" },
});
```

> **Note**: A free MongoDB Atlas cluster is available at [mongodb.com/atlas](https://www.mongodb.com/atlas). Enable Vector Search in the UI (one click).

### Prerequisites

- Node.js ≥ 18
- A [MongoDB Atlas](https://www.mongodb.com/atlas) cluster with **Atlas Vector Search** enabled **AND/OR** a PostgreSQL database with `pgvector` enabled.
- An embedding model API key (Gemini, OpenAI) **or** a local model (Ollama / Transformers)

### Installation

```bash
npm install @manasdb/core

# Then, install ONLY the driver(s) for the database you plan to use:
npm install mongodb     # If using MongoDB Atlas
npm install pg          # If using PostgreSQL
npm install ioredis     # Optional: For Tier 1 Redis Semantic Caching
```

### Environment Setup

Create a `.env` file:

```env
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/
POSTGRES_URI=postgresql://user:password@localhost:5432/vectors
```

### Basic Usage

ManasDB can be initialized to use MongoDB, PostgreSQL, or both simultaneously (Polyglot):

**1. MongoDB Only**

```javascript
import { ManasDB } from "@manasdb/core";

const memory = new ManasDB({
  uri: process.env.MONGODB_URI,
  dbName: "my_ai_app",
  projectName: "knowledge_base",
  modelConfig: { source: "transformers" }, // Free local embeddings
  telemetry: true, // Default: true. Records performance metrics to
  // _manas_telemetry in your own database.
  // Powers npx manas stats + ui dashboard.
  // Set false to disable. Data never leaves your server.
  debug: false,
});
```

**2. PostgreSQL Only**

```javascript
import { ManasDB } from "@manasdb/core";

const memory = new ManasDB({
  uri: process.env.POSTGRES_URI,
  projectName: "knowledge_base",
  modelConfig: { source: "transformers" },
  telemetry: true,
  debug: false,
});
```

**3. Polyglot (Both MongoDB & PostgreSQL)**

```javascript
import { ManasDB } from "@manasdb/core";

const memory = new ManasDB({
  databases: [
    { type: "mongodb", uri: process.env.MONGODB_URI, dbName: "my_ai_app" },
    { type: "postgres", uri: process.env.POSTGRES_URI },
  ],
  cache: { provider: "redis", uri: process.env.REDIS_URI }, // Tier 1 Cache
  reasoning: { enabled: true }, // Enable Hierarchical Tree Index
  projectName: "knowledge_base",
  modelConfig: { source: "transformers" },
  telemetry: true,
  debug: false,
});
await memory.init();

// Store knowledge
await memory.absorb(`
  The James Webb Space Telescope launched on December 25, 2021.
  It uses infrared imaging to observe galaxies formed shortly after the Big Bang.
  Its primary mirror spans 6.5 meters and is made of 18 hexagonal beryllium segments.
`);

// Retrieve precise answers using Hierarchical Reasoning Tree
const treeResult = await memory.reasoningRecall(
  "What is James Webb's mirror made of?",
  {
    topSections: 3,
    topSection: 0,
  },
);

console.log(treeResult.leaves[0].text);
// → "Its primary mirror spans 6.5 meters and is made of 18 hexagonal beryllium segments."

// Access the pipeline trace to view telemetry and caching
console.log(treeResult._trace);
// → { reasoning: true, cacheHit: 'redis', tokens: 9, costUSD: 0 }
```

---

## ✨ Features

| **Governance & Portability** | ProjectRegistry for multi-tenancy, migrateTo() for provider/model switching, and monthly budget caps. |
| **Observability** | Programmer hooks via onTrace() for production monitoring of tokens, costs, and retrieval internal decisions. |
| **Hybrid Retrieval (RRF + MMR)** | Fuses Dense ANN vector search and Sparse keyword search via Reciprocal Rank Fusion, then diversified with MMR. |

---

## 🏗️ Core Architecture

### 1. Ingestion Flow (Absorb)

When you call `absorb()`, ManasDB coordinates a multi-stage pipeline:

1. **Budget Check**: Validates that the operation won't exceed your monthly spending cap.
2. **PII Shield**: Detects and redacts sensitive data (Email, SSN, Credit Cards) before it reaches the AI.
3. **Tokenization**: Estimates costs using a fast, local BPE-approximated tokenizer.
4. **Polyglot Broadcast**: Parallel storage across MongoDB (best for scale) and PostgreSQL (best for relational queries).
   | **Hybrid Retrieval (RRF + MMR)** | Fuses Dense ANN vector search and Sparse keyword search via Reciprocal Rank Fusion, then diversifies with Maximal Marginal Relevance |
   | **Hierarchical Tree Reasoning** | `reasoningRecall()` maps chunks into document > section > leaf nodes to enable ultra-precise retrieval over massive texts |
   | **Sentinel Micro-Index** | Dual-layer storage: chunk-level vectors for broad recall, sentence-level micro-vectors for sentence-level QA retrieval. |
   | **Token-Aware Chunking** | Replaces naive sentence splitting with dynamic token-budget sliding windows that respect section boundaries |
   | **Context Healing** | Reconstructs full document context from chunks on-the-fly without duplicating text in MongoDB |
   | **Two-Tier Semantic Cache** | Tier 1: Shared Redis Cache across servers. Tier 2: In-Memory LRU. Both short-circuit the DB if query cosine ≥ 0.95. |
   | **Vector Quantization** | `int8` and `float16` compression for ANN search; stores full `float32` for exact cosine reranking |
   | **Adaptive Retrieval Routing** | Automatically detects query intent (numeric / short factual / long conceptual) and adjusts dense/sparse weights |
   | **PII Shield** | Regex-based redaction of emails, phone numbers, SSNs, and custom patterns before any text leaves your server |
   | **Trace Debugging** | Every `recall()` call emits a `_trace` object: cache hit, PII tokens scrubbed, candidate counts, fallback status, final score |
   | **Cost Telemetry** | Tracks tokens, financial cost, and latency savings from deduplication — viewable via `npx manas stats` |
   | **Lazy-Loaded Architecture** | Storage and Cache dependencies (`pg`, `mongodb`, `ioredis`) are gracefully lazy-loaded on demand. 100% crash-free zero bloat. |
   | **Custom Plugin Drivers** | Pass any embedding driver via `modelConfig: { source: 'custom', driver: MyDriver }` |
   | **Optional source protection build for commercial deployments** | `npm run build` compiles source to V8 bytecode (`.jsc`) — source logic is obfuscated and compiled into V8 bytecode. |

---

## 📊 Benchmarks

### Redis Tier 1 Caching vs Native DB

Hierarchical Tree-Reasoning (chunked QA retrieval) requires intensive database aggregation. The optional integration of **Tier 1 Redis Caching** provides massive speedups for repeated queries.

| Query Type (MongoDB) | Tree Search (Native) | Redis Tier 1 Cache | Performance Gain |
| :------------------- | :------------------- | :----------------- | :--------------- |
| **Complex QA (Q1)**  | ~120 ms              | ~4 ms              | **29.0x Faster** |
| Short factual (Q2)   | ~3.2 ms              | ~4.2 ms            | **Bypassed\***   |

| Query Type (Postgres) | Tree Search (Native) | Redis Tier 1 Cache | Performance Gain |
| :-------------------- | :------------------- | :----------------- | :--------------- |
| **Complex QA (Q1)**   | ~111 ms              | ~12 ms             | **9.0x Faster**  |
| Short factual (Q2)    | ~3.3 ms              | ~8.6 ms            | **Bypassed\***   |

> **\*Short-Query Bypass**: Queries under 3 words are instantly routed to the native database to avoid Redis TCP transport overhead, as Postgres and MongoDB execute these in < 4ms natively.

---

### Full Pipeline Benchmark

Run the built-in benchmark suite against your own cluster:

```bash
npx manas benchmark
```

The tool auto-detects which providers are configured (`MONGODB_URI`, `POSTGRES_URI`) and produces **three independent sections** — one per provider and one for the polyglot combination. Sample output with both providers active:

```
=====================================================
🚀  MANASDB VS. TRADITIONAL PIPELINE BENCHMARK
=====================================================

  Detected Providers:
    ✔ MongoDB   (MONGODB_URI)
    ✔ PostgreSQL (POSTGRES_URI / DATABASE_URL)

────────────────────────────────────────────────────────────
📦  SECTION 1 — MongoDB Only
────────────────────────────────────────────────────────────

  MongoDB
  ············································~~~~~~~~~~~~~~~~
  Metric                   Raw Stack          ManasDB
  ····························································
  Absorb time              1200ms             673ms
  Latency (avg)            310ms              9ms (-97%)
  API Cost                 $0.024/10k         $0.012/10k (-50%)
  Recall Accuracy          82.4%              91.2% (+8.8%)
  Dedup / Cache            None               SHA256 + Cosine LRU
  PII Protection           Manual             Built-in (per-field)
  ····························································

────────────────────────────────────────────────────────────
🐘  SECTION 2 — PostgreSQL Only
────────────────────────────────────────────────────────────

  PostgreSQL
  ····························································
  Metric                   Raw Stack          ManasDB
  ····························································
  Absorb time              1200ms             65ms
  Latency (avg)            310ms              2ms (-99%)
  API Cost                 $0.024/10k         $0.012/10k (-50%)
  Recall Accuracy          82.4%              91.8% (+9.4%)
  Dedup / Cache            None               SHA256 + Cosine LRU
  PII Protection           Manual             Built-in (per-field)
  ····························································

────────────────────────────────────────────────────────────
🌐  SECTION 3 — Polyglot (MongoDB + PostgreSQL)
────────────────────────────────────────────────────────────

  MongoDB + PostgreSQL
  ····························································
  Metric                   Raw Stack          ManasDB
  ····························································
  Absorb time              1201ms             399ms
  Latency (avg)            310ms              8ms (-97%)
  API Cost                 $0.024/10k         $0.012/10k (-50%)
  Recall Accuracy          82.4%              92.1% (+9.7%)
  Dedup / Cache            None               SHA256 + Cosine LRU
  PII Protection           Manual             Built-in (per-field)
  ····························································

════════════════════════════════════════════════════════════
  Notes:
  • Raw stack latency (310ms) is a representative baseline for a
    naive single-DB lookup with no caching or deduplication.
  • All ManasDB scores are normalized to [0,1] across providers
    for unbiased polyglot score merging.
  • Cost savings are driven by SHA256 dedup + float16 compression.
════════════════════════════════════════════════════════════
```

---

## 📖 API Reference

### 💰 Governance & Budgeting

ManasDB is built for enterprises that need to control AI spend. You can set hard monthly caps directly in the constructor.

```javascript
const memory = new ManasDB({
  uri: process.env.MONGODB_URI,
  retry: {
    budget: {
      monthlyLimit: 10.0, // $10.00 USD hard cap
    },
  },
});

// Pre-flight check: "How much will this cost before I embed it?"
const estimate = memory.estimateAbsorbCost("Giant 50 page document...");
console.log(`Estimated Cost: $${estimate.estimatedCostUSD}`);
```

### 🔄 Data Migration

Need to switch from MongoDB to Postgres? Or from OpenAI to a local model? ManasDB handles the heavy lifting.

```javascript
await memory.migrateTo({
  uri: process.env.POSTGRES_URI,
  modelConfig: { source: "openai", model: "text-embedding-3-small" },
});
```

### 🧹 Memory Lifecycle

Keep your database lean with automatic expiration and semantic deduplication.

```javascript
// Remove memories older than 30 days
await memory.expireOlderThan("30d");

// Prune semantic duplicates (threshold 0.95 similarity)
await memory.dedup({ minSimilarity: 0.95 });
```

### `memory.init()`

Initializes database connections and verifies the **Model Dimension Lock**.

- If your existing data was embedded with 1536 dims and you try to init with a 384 dim model, ManasDB will block initialization to prevent corrupted results.

### `memory.absorb(text, options)`

- `text`: String to be remembered.
- `options.metadata`: Optional key-value tags.
- `options.maxTokens`: Chunk size (default 100).
- **Throws**: `Budget Exceeded` error if ingestion would surpass monthly limit.

### `memory.recall(query, options)`

- `options.limit`: Number of results (default 5).
- `options.lambda`: Diversity score (0.0 - 1.0). Default 1.0 (pure relevance).
- `options.mode`: `'qa'` (returns `_trace`) or `'document'` (heals context).
- **Returns**: `_trace` object containing tokens, cost, and retrieval duration.

### `memory.onTrace(callback)`

Subscribe to internal decision logs programmatically.

```javascript
memory.onTrace((trace) => {
  console.log("Retrieval Query:", trace.query);
  console.log("Decision Nodes:", trace.nodes);
});
```

### `memory.forgetMany(query)`

GDPR-compliant erasure. Returns an audit object:

```javascript
{
  deletedTotal: 15,
  timestamp: "2026-03-17...",
  providers: [{ provider: "mongo", deleted: 15 }]
}
```

### `absorb(rawText, options?)`

Ingests and indexes a text document.

```javascript
await memory.absorb(text, {
  metadata: { tag: "value" }, // Attach custom tags for forgetMany querying
  maxTokens: 100, // Max tokens per chunk (default: 100 ≈ 2 sentences)
  overlapTokens: 20, // Token overlap between adjacent chunks (default: 20)
});
// Returns:
// {
//   contentId,
//   vectorId,
//   chunks: number,
//   costAnalysis: { tokens: 142, estimatedCostUSD: 0.00284 }
// }
```

### `recall(query, options?)`

Retrieves semantically matching memories.

```javascript
const results = await memory.recall(query, {
  mode: "qa", // 'document' (chunk recall) | 'qa' (sentence micro-index)
  limit: 5, // Maximum results to return
  minScore: 0.05, // Minimum cosine similarity threshold
  lambda: 0.6, // MMR λ: 1 = pure relevance, 0 = pure diversity
  rrfK: 60, // RRF constant k
  debug: false, // Per-call debug override
});

// Result shape:
// [{
//   contentId,
//   text,           // Full reconstructed document context
//   score,          // Best cosine score from contributing chunks
//   metadata: {
//     matchedChunk,  // The exact sentence/chunk that answered the query
//     sectionTitle,  // Markdown section heading if present
//     allScores,     // All contributing chunks with individual scores
//     healedContext  // true — context was reconstructed from chunks
//   }
// }]
//
// results._trace — pipeline audit log
// { cacheHit: false, rrfMerged: 11, tokens: 9, costUSD: 0.00018 }
```

### `reasoningRecall(query, options?)`

Hierarchical tree-based reasoning recall. Instead of a flat vector search, this maps documents into a `Document → Section → Leaf` hierarchy. It selects the highest-scoring section and returns all its contributing leaf nodes for deep, structured context.

> **Requires:** `new ManasDB({ reasoning: { enabled: true } })` initialized.

```javascript
const result = await memory.reasoningRecall(
  "Summarize the Q3 Financial Goals",
  {
    topSections: 5, // Rank the top 5 document sections
    topSection: 0, // Select the absolute best one (index 0)
  },
);

// Result shape:
// {
//   section: "Q3 Strategy Board Meeting", // The markdown header it grouped by
//   score: 0.9412,                        // Cosine match of the section summary
//   leaves: [
//     { text: "We plan to increase revenue...", chunkIndex: 12 },
//     { text: "By expanding the sales team...", chunkIndex: 13 }
//   ],
//   _trace: { reasoning: true, selectedSection: "hash", cacheHit: 'redis', tokens: 8, costUSD: 0 }
// }
```

### `forget(documentId)`

Alias for `delete(documentId)`. Erases the document and all associated chunks/vectors.

```javascript
await memory.forget("doc_123");
```

### `forgetMany(query)`

Bulk erase documents matching metadata criteria. Returns an audit object.

```javascript
const report = await memory.forgetMany({ userId: "user_99" });
console.log(`Deleted ${report.deletedTotal} docs at ${report.timestamp}`);
```

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Your Application                  │
└────────────────────────┬────────────────────────────┘
                         │  absorb() / recall() / reasoningRecall()
┌────────────────────────▼─────────────────────────────┐
│                   ManasDB SDK                        │
│                                                      │
│  ┌──────────────┐  ┌───────────┐  ┌──────────────┐   │
│  │  PII Shield  │  │  Chunker  │  │ Tree Reason  │   │
│  └──────────────┘  └─────┬─────┘  └──────────────┘   │
│                           │                          │
│  ┌────────────────────────▼──────────────────────┐   │
│  │          Embedding Provider                   │   │
│  │  OpenAI · Gemini · Ollama · Transformers      │   │
│  └────────────────────────┬──────────────────────┘   │
│                           │                          │
│  ┌────────────────────────▼──────────────────────┐   │
│  │  Tier 1 Redis Cache <──> Tier 2 In-Memory LRU │   │
│  └────────────────────────┬──────────────────────┘   │
│                           │ Polyglot Broadcast       │
│            ┌──────────────┴───────────────┐          │
│            ▼                              ▼          │
│  ┌─────────────────┐           ┌──────────────────┐  │
│  │  MongoDB Atlas  │           │   PostgreSQL     │  │
│  │  $vectorSearch  │           │   pgvector       │  │
│  │  Full-text idx  │           │   tsvector       │  │
│  └─────────────────┘           └──────────────────┘  │
└──────────────────────────────────────────────────────┘
```

---

## 📐 Pipeline Architecture

```
ABSORB PIPELINE
───────────────
Raw Text
  │
  ├─ PII Shield (optional redaction)
  │
  ├─ Token-Aware Chunker (_tokenAwareChunk)
  │     ├─ Section-boundary detection (### headers / double-newlines)
  │     ├─ Dynamic token-budget sliding window (default 100 tokens)
  │     └─ Overlap buffer (default 20 tokens) for context continuity
  │
  ├─ Chunk Embedding + Deduplication (content-hash SHA256)
  │     └─ int8 / float16 / float32 quantization guardrail
  │
  └─ Sentence Micro-Index (per-chunk sentence vectors)
        └─ Stored with profile suffix `_sentence` for QA mode

  ├─ Provider Broadcast (Concurrent Insertions)
  │     ├─ MongoDB Driver   → Inserts into _manas_documents / _manas_chunks / _manas_vectors
  │     └─ PostgreSQL Driver → Inserts into _manas_documents / _manas_chunks / _manas_vectors
  │
  └─ Polyglot Telemetry Broadcast → _manas_telemetry (all active databases)

RECALL PIPELINE
───────────────
Query String
  │
  ├─ [Cache] Tier 1: Dedicated Redis shared Cache
  │     └─ If cosine ≥ 0.95 → Return immediately (Bypass DB)
  │
  ├─ [Cache] Tier 2: In-Memory Node.js LRU Cache
  │     └─ If cosine ≥ 0.95 → Return immediately (Bypass DB + Redis)
  │
  ├─ Adaptive Mode Detection
  │     ├─ < 3 tokens   → DB Bypass (Short Factual Query)
  │     ├─ Named entity → Dense-heavy (0.8 / 0.2)
  │     ├─ Numeric      → Sparse-heavy (0.2 / 0.8)
  │     └─ Long query   → Dense-heavy (0.8 / 0.2)
  │
  ├─ Multi-Database Vector Search Mapping
  │     ├─ [A] Atlas $vectorSearch (ANN)
  │     ├─ [B] Postgres `<=>` Cosine Sorting (pgvector)
  │
  ├─ [C] Default recall(): Reciprocal Rank Fusion / Rerank
  │     └─ Returns merged dense + sparse unified scores
  │
  ├─ [D] reasoningRecall(): Hierarchical Tree Search
  │     └─ Ranks document > Parses best Section > Returns Leaf nodes
  │
  ├─ [E] Exact Cosine Rerank
  ├─ [F] Context Healing — Reconstruct full parent document from chunks
  │
  └─ PII Output Shield (Optional) → SearchFormatter (Polyglot Schema)
        └─ Returns matchedChunk + tokens/cost USD metrics
```

---

## 🎯 Real-World Use Cases

| Industry                 | Use Case                                                         |
| ------------------------ | ---------------------------------------------------------------- |
| **Customer Support**     | AI chatbot that answers from your product docs + ticket history  |
| **Developer Tools**      | Semantic search over API references and changelogs               |
| **Legal / Compliance**   | Clause retrieval from contracts with PII auto-redaction          |
| **Healthcare**           | Patient-record Q&A with strict PII Shield enabled                |
| **E-commerce**           | Product recommendation from natural-language intent              |
| **Enterprise Knowledge** | Internal wiki search that understands context, not just keywords |
| **EdTech**               | Curriculum-aware Q&A that cites exact lesson passages            |

ManasDB is optimised for **10K – 10M vectors**. Typical deployment: a monorepo Node.js backend, one Mongo Atlas free/shared cluster, and a managed Postgres instance.

---

## 🚫 When NOT to Use ManasDB

Being honest about limits builds trust.

- **Billion-scale vector search** — use Pinecone, Milvus, or Weaviate instead; ManasDB is optimised for mid-scale RAG (up to ~10M vectors per project).
- **GPU-accelerated ANN** — ManasDB relies on Atlas `$vectorSearch` and `pgvector`; neither runs on-device GPU cores.
- **Graph traversal / knowledge graphs** — use Neo4j or Amazon Neptune; ManasDB is flat-document oriented.
- **Streaming ingestion at millions of events/sec** — ManasDB is batch/document ingestion, not a streaming pipeline.
- **Already deeply coupled to LangChain memory** — if your stack relies on `ConversationBufferMemory` patterns, adopt ManasDB incrementally.

---

## ⚠️ Known Constraints

- Requires MongoDB Atlas Vector Search **or** PostgreSQL with `pgvector` enabled (or both).
- Sentence micro-index increases vector count (~1.5–2× storage) but boosts short-form QA precision ~30%.
- Quantized vectors (`int8` / `float16`) trade minimal ANN precision for reduced storage.
- Documents > 50 K tokens are auto-chunked to prevent excessive memory use.
- Retrieval performance depends on connection latency to your cluster.

---

## 🛠️ CLI Tool

```bash
# Health check — MongoDB connection and index status
npx manas health

# ROI dashboard — token savings, cost reduction, deduplication stats
npx manas stats

# Visual trace debugger — shows exactly how a query was resolved
npx manas trace "What is James Webb's primary mirror made of?"

# Run the full benchmark suite
npx manas benchmark
```

### Example `trace` output

```json
{
  "cacheHit": false,
  "piiScrubbed": 0,
  "denseCandidates": 20,
  "sparseCandidates": 7,
  "rrfMerged": 14,
  "mmrSelected": 3,
  "fallbackTriggered": false,
  "finalScore": 0.938,
  "tokens": 12,
  "costUSD": 0.00024
}
```

---

## 📡 Telemetry

ManasDB records operational metrics to `_manas_telemetry` in **your own database**. This data never leaves your server.

| Field               | What It Stores                               |
| ------------------- | -------------------------------------------- |
| `durationMs`        | Query execution time                         |
| `cacheHit`          | Whether Redis/LRU cache served the result    |
| `retrievalPath`     | Which retrieval strategy was used            |
| `finalScore`        | Top cosine similarity score                  |
| `tokens`            | Embedding tokens consumed                    |
| `costUSD`           | Estimated API cost                           |
| `savedByCache`      | Cost saved by cache hit                      |
| `queryLengthBucket` | short / medium / long (never the query text) |
| `sdkVersion`        | ManasDB version in use                       |
| `nodeVersion`       | Node.js runtime version                      |

**Never stored:** query text, document content, vectors, or any PII.

This powers `npx manas stats`, `npx manas ui`, and the trace debugger. Telemetry is **on by default**. To opt out:

```javascript
new ManasDB({ uri: process.env.MONGODB_URI, telemetry: false });
```

> **A note on the future:** ManasDB Cloud will offer an opt-in feature to contribute anonymized performance gradients (never content, never vectors — only behavioral math like score distributions and retrieval paths) to improve retrieval intelligence across all agents. This will always be explicitly opt-in, clearly documented, and auditable before enabling.

---

## 🗃️ Storage Schemas

ManasDB automatically migrates and configures schemas. Both **MongoDB** and **PostgreSQL** use **identical naming conventions**, making it easy to reason about data across providers:

### MongoDB Collections & PostgreSQL Tables

| Name               | Purpose                                                                             |
| ------------------ | ----------------------------------------------------------------------------------- |
| `_manas_documents` | Parent document registry (metadata + content hash)                                  |
| `_manas_chunks`    | Token-aware text chunks with section titles and tags                                |
| `_manas_vectors`   | Embeddings — stores both `vector` (compressed ANN) and `vector_full` (exact rerank) |
| `_manas_telemetry` | Operation event log (cost, latency, deduplication events)                           |

> Both MongoDB and PostgreSQL use the same four table/collection names for full schema parity.

---

## 💡 Supported Embedding Providers

| Provider            | `source` value | Model Examples                    | Cost               |
| ------------------- | -------------- | --------------------------------- | ------------------ |
| Local Transformers  | `transformers` | `all-MiniLM-L6-v2`                | Free               |
| Ollama              | `ollama`       | `nomic-embed-text`                | Free (self-hosted) |
| OpenAI              | `openai`       | `text-embedding-3-small`          | ~$0.02/1M tokens   |
| Google Gemini       | `gemini`       | `gemini-embedding-001`            | ~$0.10/1M tokens   |
| Custom / Air-gapped | `custom`       | Any driver implementing `embed()` | Varies             |

---

## ⚙️ Configuration Reference

```javascript
new ManasDB({
  // ── Single Database (Auto-Discovery) ────────────────────────────────
  // Supply a connection string. ManasDB reads the prefix to mount the
  // correct provider automatically. No dbType needed.
  uri: process.env.DATABASE_URI, // 'mongodb://' or 'postgres://' detected automatically
  dbName: "my_database", // Optional: required for MongoDB only

  // ── OR – Explicit single DB with dbType override ─────────────────────
  // uri: process.env.DATABASE_URI,
  // dbType: 'postgres',   // Force: 'mongodb' | 'postgres' | 'pg'

  // ── OR – Polyglot Mode (Multiple Databases) ──────────────────────────
  // databases: [
  //   { type: "mongodb", uri: process.env.MONGODB_URI, dbName: "my_database" },
  //   { type: "postgres", uri: process.env.POSTGRES_URI },
  // ],

  projectName: "my_project", // Namespace — isolates data per project.
  modelConfig: {
    source: "gemini", // 'transformers' | 'ollama' | 'openai' | 'gemini' | 'custom'
    model: "gemini-embedding-001", // Optional. Provider-specific model name.
    driver: MyCustomDriver, // Required only when source: 'custom'
  },
  piiShield: {
    enabled: true,
    customRules: [/MY_REGEX/g], // Additional PII patterns to redact
  },
  cache: {
    provider: "redis",
    uri: process.env.REDIS_URI || "redis://localhost:6379",
    semanticThreshold: 0.92, // Fuzzy matching threshold for cache hits
    ttl: 3600, // Expiration time in seconds
  },
  reasoning: {
    enabled: true, // Enables TreeIndex layout for reasoningRecall()
  },
  telemetry: true, // Logs events to _manas_telemetry (all configured databases)
  debug: false, // Prints model/profile keys on each operation
});
```

### 🚨 Strict Mode (Zero-Config Protection)

To prevent silent failures if you accidentally omit a database URI (or forget to load a `.env` file), ManasDB implements a **Strict Mode**.

- Initializing `new ManasDB({})` and calling `await memory.init()` without databases will **succeed and issue a warning** (so it never crashes your server on boot).
- However, if your application tries to execute `await memory.absorb()` or `await memory.recall()` when zero databases are loaded, ManasDB will **Fail Fast** and throw a descriptive error: `MANASDB_ERROR: Cannot absorb(). No valid database providers were configured`.

---

## 🏢 Enterprise Readiness

ManasDB is designed to scale with MongoDB Atlas vector workloads. Here is how it handles production demands:

- **10M+ Vectors:** Vector indexing scalability is handled by MongoDB Atlas `$vectorSearch` (HNSW). Atlas clusters commonly support tens of millions of vectors
  depending on cluster tier.
- **Index Stability:** Prevents duplicate index creation natively. Recognizes when developers switch embedding models and provides a safety-gated `npx manas index-prune` command to gracefully wipe stale dimension indexes.
- **No Data Leaks:** Telemetry writes strictly to the `_manas_telemetry` collection on _your own_ cluster. **Zero text or PII is ever logged**—only operational metrics like `durationMs` and numeric `costs`.
- **Concurrency Safety:** Read paths (`recall`) are completely stateless. Write paths (`absorb`) are protected by atomic `$setOnInsert` upserts, preventing vector duplication when requests race.
- **Bounded Memory:** Hard caps ensure stable heap. The `limit: 5000` is truncated by `fetchLimit: 200` to prevent memory flooding during reranking. Context-healing caps out at 100 chunks per document lookup, and sentence ingestion occurs in garbage-collected batches.

---

## 🔌 Custom Embedding Driver (Plugin Ecosystem)

Plug in any air-gapped, corporate, or custom embedding model:

```javascript
class MyInternalDriver {
  getModelKey() {
    return "internal-v2";
  }
  async embed(text) {
    const vector = await myCompanyEmbeddingAPI(text);
    return { vector, dims: vector.length, model: this.getModelKey() };
  }
}

const memory = new ManasDB({
  uri: process.env.MONGODB_URI,
  dbName: "corp_knowledge",
  projectName: "contracts",
  modelConfig: {
    source: "custom",
    driver: new MyInternalDriver(),
  },
});
```

ManasDB becomes the **standard interface** over your entire AI embedding stack.

---

## 🔐 Security: Machine Bytecode Build

For production deployments where source code must remain proprietary:

```bash
npm run build
```

This runs a three-stage compiler pipeline:

1. **Bundle** — `esbuild` bundles all internal source into a single CommonJS file, excluding `node_modules`
2. **Minify** — variable names and whitespace are aggressively stripped
3. **Bytecode** — `bytenode` compiles the bundle into V8 machine bytecode (`.jsc`)

Your private chunking algorithms, scoring formulas, and pipeline logic become **Obfuscated and compiled** to V8 bytecode to protect proprietary logic. The output is a `dist/index.cjs` loader + `dist/manasdb.jsc` binary.

---

<details>
<summary>📁 Project Structure</summary>

```
manasdb/
├── bin/
│   └── manas.js            # CLI tool (stats, health, trace, benchmark)
├── src/
│   ├── index.js            # Main SDK class (ManasDB) — URI auto-discovery + polyglot orchestration
│   ├── benchmark.js        # Benchmark suite runner
│   ├── health.js           # Health check script
│   ├── providers/          # Storage providers (Polyglot Persistence)
│   │   ├── base.js             # BaseProvider interface
│   │   ├── mongodb.js          # MongoProvider (MongoDB Atlas)
│   │   └── postgres.js         # PostgresProvider (pgvector)
│   ├── core/
│   │   ├── connection.js       # MongoDB singleton connection manager
│   │   ├── memory-engine.js    # Low-level memory operations
│   │   ├── model-factory.js    # Provider factory + custom driver support
│   │   └── providers/
│   │       ├── base.provider.js
│   │       ├── cloud.provider.js    # OpenAI + Gemini
│   │       ├── ollama.provider.js
│   │       └── transformers.provider.js  # Local @xenova/transformers
│   └── providers/             # Storage drivers (DB-agnostic)
│       ├── base.js            #   BaseProvider interface all drivers extend
│       ├── factory.js         #   ProviderFactory — lazy dynamic import registry (Plan 10)
│       ├── mongodb.js         #   MongoDB Atlas vector search driver
│       └── postgres.js        #   PostgreSQL + pgvector driver
│   └── utils/
│       ├── CostCalculator.js   # Token estimation & financial cost calc
│       ├── ModelRegistry.js    # Dimension lookup per model
│       ├── PIIFilter.js        # PII redaction engine
│       ├── SearchFormatter.js  # Result formatting utilities
│       ├── Telemetry.js        # Polyglot Fire-and-forget event logging
│       └── TokenCounter.js     # Token counting helpers
├── tests/
│   ├── test-e2e.js            # MongoDB E2E QA test suite
│   ├── test-e2e-pg.js         # PostgreSQL E2E QA test suite
│   ├── test-features.js       # MongoDB feature tests (PII, dedup, cache)
│   ├── test-features-pg.js    # PostgreSQL feature tests
│   ├── test-large-random.js   # MongoDB large document tests
│   ├── test-large-random-pg.js # PostgreSQL large document tests
│   ├── test-polyglot-e2e.js   # Polyglot (Mongo+Postgres) E2E tests
│   └── test-polyglot-features.js # Polyglot feature tests
├── examples/                  # Runnable copy-paste examples
│   ├── mongodb-basic/         # MongoDB-only starter project
│   │   ├── index.js           #   Working example code
│   │   ├── test.js            #   Self-contained test suite (16 assertions)
│   │   └── README.md
│   ├── postgres-basic/        # PostgreSQL-only starter project
│   │   ├── index.js
│   │   ├── test.js
│   │   └── README.md
│   └── polyglot-mode/         # Both providers simultaneously
│       ├── index.js
│       ├── test.js            #   Polyglot-specific assertions (health, merge, dedup)
│       └── README.md
├── docs/                      # Architecture decision documents (PLAN_01 through PLAN_10)
├── dist/                      # Compiled bytecode output (npm run build)
├── build.js                   # Security compiler (esbuild + bytenode)
├── verify-lazy-loading.js     # Proves lazy-loading works (11 assertions)
└── package.json
```

> See [`/examples`](./examples) for self-contained, runnable projects — copy one into your own repo to get started immediately.

</details>

---

## 🗺️ Roadmap

### v0.5 (Coming soon)

- [ ] Native TypeScript typings package (`@manasdb/types`)
- [ ] Elasticsearch adapter

### v0.6 (Coming soon)

- [ ] `npx manas ui` — web dashboard for trace visualization
- [ ] MySQL + DynamoDB adapters

---

## 📋 Changelog

**v0.4.2** — Budget Guardrails, Data Migration, ProjectRegistry (Multi-tenancy), Model Dimension Lock, and Zero-Config Bootstrap.
**v0.4.1** — Added `package-lock.json` to `.gitignore`.
**v0.4.0** — Telemetry on by default, expanded metrics (retrievalPath, finalScore, savedByCache, sdkVersion, nodeVersion), clearTelemetry() added as explicit method, 2-year TTL index on \_manas_telemetry, Redis Tier 1 caching, Hierarchical Tree Reasoning, benchmark suite, MCP server ([@manasdb/mcp-server](https://www.npmjs.com/package/@manasdb/mcp-server))  
**v0.3.x** — Polyglot broadcasting, PII Shield, Sentinel Micro-Index  
**v0.1-0.2** — Core hybrid retrieval, initial release

---

## 🤝 Contributing

If ManasDB saves you time, consider supporting development:

[![Support ManasDB](https://img.shields.io/badge/Support-ManasDB-%230066CC?style=for-the-badge&logo=razorpay&logoColor=white)](https://razorpay.me/@manasdb)

Contributions are also welcome via PRs! Please open an issue before submitting a pull request.

```bash
# Clone and install
git clone https://github.com/manasdb/manasdb.git
cd manasdb
npm install

# Run the test suite
npm run test:all

# Run health check
npm run health
```

---

## 📄 License

**Core SDK (`@manasdb/core`)**: Apache 2.0 + Commons Clause

Free for all use — personal, commercial, production —
**unless** your product is ManasDB itself (hosting,
reselling, or repackaging ManasDB as your primary offering).

| Use Case                                           | Free                |
| -------------------------------------------------- | ------------------- |
| Building an app that uses ManasDB as a dependency  | ✅ Yes              |
| Using ManasDB in your company's production systems | ✅ Yes              |
| Open source projects                               | ✅ Yes              |
| Research and education                             | ✅ Yes              |
| Offering hosted ManasDB as a service to others     | ❌ License required |
| Reselling or repackaging ManasDB as your product   | ❌ License required |

> **The simple test:** Are you selling ManasDB, or something you built
> using ManasDB? If you built something WITH it → free. Always.
> If you are selling ManasDB itself → contact us.

→ See [COMMERCIAL_LICENSE.md](./COMMERCIAL_LICENSE.md) for full details.

For commercial licensing, open a
[GitHub Discussion](https://github.com/manasdb/manasdb/discussions).

**ManasDB Cloud + Dashboard**: Commercial License
**Enterprise features**: Commercial License

---

## 💬 The Story Behind ManasDB

I built this alone, without funding, after watching every developer I know rebuild the same fragile RAG pipeline from scratch — including myself.

ManasDB started as an experiment to simplify production RAG pipelines.

Most vector databases provide fast ANN search. But real AI systems also need
hybrid retrieval (dense + sparse), reranking, semantic caching, deduplication,
PII filtering, cost tracking, and cross-provider consistency — pieces that
must be built from scratch in every project.

Instead of wiring these pieces together at the application layer,
ManasDB moves them directly into the storage layer — so your application stays
clean and the retrieval intelligence lives where the data lives.

The result is a single SDK that handles the full memory lifecycle:
ingest → chunk → embed → deduplicate → store → cache → retrieve → heal → audit.

---

<div align="center">
  <sub>Built for developers who care about how their AI stack actually works.</sub>
</div>
