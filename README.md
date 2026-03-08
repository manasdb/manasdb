<div align="center">

<a href="https://www.npmjs.com/package/@manasdb/core"><img src="https://img.shields.io/npm/v/@manasdb/core?style=for-the-badge&logo=npm" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/package/@manasdb/core"><img src="https://img.shields.io/npm/dw/@manasdb/core?style=for-the-badge&logo=npm&label=Weekly%20Downloads" alt="Weekly Downloads" /></a>
<a href="https://www.npmjs.com/package/@manasdb/core"><img src="https://img.shields.io/npm/dt/@manasdb/core?style=for-the-badge&logo=npm&label=Total%20Downloads" alt="Total Downloads" /></a>
<img src="https://img.shields.io/badge/License-BSL%201.1-orange?style=for-the-badge" />
<img src="https://img.shields.io/badge/Node.js-%3E=18.0-green?style=for-the-badge&logo=nodedotjs" />
<img src="https://img.shields.io/badge/MongoDB-Atlas-blue?style=for-the-badge&logo=mongodb" />
<img src="https://img.shields.io/badge/PostgreSQL-pgvector-blue?style=for-the-badge&logo=postgresql" />
<img src="https://img.shields.io/badge/Models-OpenAI%20%7C%20Gemini%20%7C%20Ollama%20%7C%20Local-lightgrey?style=for-the-badge" />

<br /><br />

# 🧠 ManasDB

### Hybrid Retrieval Engine for MongoDB Atlas and PostgreSQL

**Hybrid vector retrieval · Token-aware chunking · Self-healing retrieval · PII protection · Multi-database broadcasting**

[Getting Started](#-quick-start) · [Architecture](#-architecture) · [API Reference](#-api-reference) · [Benchmark](#-benchmark) · [CLI](#-cli-tool) · [Discussions](https://github.com/manasdb/manasdb/discussions) · [License](#-license)

</div>

> ⭐ **If you find ManasDB useful, please [star the repo](https://github.com/manasdb/manasdb) — it helps other developers discover it.**

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
ManasDB SDK  ←── Hybrid Retrieval · Cache · PII Shield · Telemetry
    ├── MongoDB Atlas  ($vectorSearch + full-text)
    └── PostgreSQL     (pgvector + tsvector)
```

The result: **better accuracy, fewer services, lower cost, fully auditable pipelines** — without rewriting your application.

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

> That's it. Swap `MONGODB_URI` for `POSTGRES_URI` and it works with PostgreSQL. Pass both in a `databases: []` array for polyglot mode.

---

## 🚀 Quick Start

### Prerequisites

- Node.js ≥ 18
- A [MongoDB Atlas](https://www.mongodb.com/atlas) cluster with **Atlas Vector Search** enabled **AND/OR** a PostgreSQL database with `pgvector` enabled.
- An embedding model API key (Gemini, OpenAI) **or** a local model (Ollama / Transformers)

### Installation

```bash
npm install @manasdb/core
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
  telemetry: true,
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

// Retrieve precise answers
const results = await memory.recall("What is James Webb's mirror made of?", {
  mode: "qa", // Uses Sentence Micro-Index for razor precision
  limit: 3,
  minScore: 0.1,
});

console.log(results[0].metadata.matchedChunk);
// → "Its primary mirror spans 6.5 meters and is made of 18 hexagonal beryllium segments."

// Access the pipeline trace
console.log(results._trace);
// → { cacheHit: false, denseCandidates: 20, sparseCandidates: 8,
// rrfMerged: 11, mmrSelected: 3, fallbackTriggered: false, finalScore: 0.94 }
```

---

## What Is ManasDB?

ManasDB is a production-focused Node.js SDK that **adds semantic retrieval capabilities** via a Polyglot Architecture. It allows you to orchestrate document ingestion and retrieval simultaneously across **MongoDB Atlas** and **PostgreSQL (`pgvector`)**. Unlike LangChain or LlamaIndex wrappers, ManasDB operates at the storage layer — giving you direct, auditable control over every pipeline stage.

Use it in any AI product that needs to:

- Store and retrieve semantic knowledge from a document corpus
- Ask precise factual questions against large unstructured text
- Cache repeated queries to slash API embedding costs
- Enforce PII redaction before data reaches cloud LLMs
- Protect proprietary retrieval logic via optional bytecode build

> **Mental model:**
> Just as Redis is the caching layer and Elasticsearch is the search layer,
> **ManasDB is the semantic memory layer** — drop it in between your application and your AI models.

---

## 🆚 Why Not LangChain / LlamaIndex?

LangChain and LlamaIndex operate at the **application orchestration layer**. They are excellent for chaining LLM calls, routing agents, and building prompt pipelines. ManasDB is complementary — not competing.

| Concern             | LangChain / LlamaIndex    | ManasDB                       |
| ------------------- | ------------------------- | ----------------------------- |
| **Layer**           | Application               | Storage                       |
| **Retrieval logic** | Wired into your app code  | Embedded in database pipeline |
| **Hybrid search**   | Manual, per-integration   | Built-in RRF + MMR            |
| **Cost tracking**   | External tooling needed   | Native telemetry table        |
| **PII protection**  | Plugin-dependent          | Built-in per-field redaction  |
| **Vendor lock-in**  | High (framework coupling) | Low (swap DBs, keep API)      |

> **You can use ManasDB as the memory backend inside a LangChain agent.** They solve different problems.

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

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Your Application                  │
└────────────────────────┬────────────────────────────┘
                         │  absorb() / recall()
┌────────────────────────▼────────────────────────────┐
│                   ManasDB SDK                       │
│                                                     │
│  ┌──────────────┐  ┌───────────┐  ┌─────────────┐  │
│  │  PII Shield  │  │  Chunker  │  │  Cache LRU  │  │
│  └──────────────┘  └─────┬─────┘  └─────────────┘  │
│                           │                         │
│  ┌────────────────────────▼──────────────────────┐  │
│  │          Embedding Provider                   │  │
│  │  OpenAI · Gemini · Ollama · Transformers      │  │
│  └────────────────────────┬──────────────────────┘  │
│                           │ Polyglot Broadcast       │
│            ┌──────────────┴───────────────┐         │
│            ▼                              ▼         │
│  ┌─────────────────┐           ┌──────────────────┐ │
│  │  MongoDB Atlas  │           │   PostgreSQL      │ │
│  │  $vectorSearch  │           │   pgvector        │ │
│  │  Full-text idx  │           │   tsvector        │ │
│  └─────────────────┘           └──────────────────┘ │
└─────────────────────────────────────────────────────┘
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

## ✨ Features

| Feature                                                         | Description                                                                                                                          |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Polyglot Broadcasting**                                       | Write once, synchronize automatically across multiple database providers (Postgres + Mongo).                                         |
| **Hybrid Retrieval (RRF + MMR)**                                | Fuses Dense ANN vector search and Sparse keyword search via Reciprocal Rank Fusion, then diversifies with Maximal Marginal Relevance |
| **Sentinel Micro-Index**                                        | Dual-layer storage: chunk-level vectors for broad recall, sentence-level micro-vectors for sentence-level QA retrieval.              |
| **Token-Aware Chunking**                                        | Replaces naive sentence splitting with dynamic token-budget sliding windows that respect section boundaries                          |
| **Context Healing**                                             | Reconstructs full document context from chunks on-the-fly without duplicating text in MongoDB                                        |
| **Semantic Cosine Cache**                                       | LRU in-memory cache with SHA256 exact-hit and 0.95 cosine-similarity fuzzy-hit to eliminate redundant embeddings                     |
| **Vector Quantization**                                         | `int8` and `float16` compression for ANN search; stores full `float32` for exact cosine reranking                                    |
| **Adaptive Retrieval Routing**                                  | Automatically detects query intent (numeric / short factual / long conceptual) and adjusts dense/sparse weights                      |
| **PII Shield**                                                  | Regex-based redaction of emails, phone numbers, SSNs, and custom patterns before any text leaves your server                         |
| **Trace Debugging**                                             | Every `recall()` call emits a `_trace` object: cache hit, PII tokens scrubbed, candidate counts, fallback status, final score        |
| **Cost Telemetry**                                              | Tracks tokens, financial cost, and latency savings from deduplication — viewable via `npx manas stats`                               |
| **Custom Plugin Drivers**                                       | Pass any embedding driver via `modelConfig: { source: 'custom', driver: MyDriver }`                                                  |
| **Optional source protection build for commercial deployments** | `npm run build` compiles source to V8 bytecode (`.jsc`) — source logic is obfuscated and compiled into V8 bytecode.                  |

---

## ⚠️ Known Constraints

- Requires MongoDB Atlas Vector Search **or** PostgreSQL with `pgvector` enabled (or both).
- Sentence micro-index increases vector count (~1.5–2× storage) but boosts short-form QA precision ~30%.
- Quantized vectors (`int8` / `float16`) trade minimal ANN precision for reduced storage.
- Documents > 50 K tokens are auto-chunked to prevent excessive memory use.
- Retrieval performance depends on connection latency to your cluster.

---

## 📐 Architecture

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
  ├─ [Cache] SHA256 exact-hit → return immediately
  ├─ [Cache] Cosine ≥ 0.95 fuzzy-hit → return immediately
  │
  ├─ Adaptive Mode Detection
  │     ├─ < 3 tokens   → Sparse-only (skip ANN entirely)
  │     ├─ Named entity → Dense-heavy (0.8 / 0.2)
  │     ├─ Numeric      → Sparse-heavy (0.2 / 0.8)
  │     └─ Long query   → Dense-heavy (0.8 / 0.2)
  │
  ├─ Multi-Database Vector Search Mapping
  │     ├─ [A] Atlas $vectorSearch (ANN)
  │     ├─ [B] Postgres `<=>` Cosine Sorting (pgvector)
  │
  ├─ [C] Reciprocal Rank Fusion / Rerank → Unified Deduplicated Scores
  ├─ [D] Exact Cosine Rerank
  ├─ [E] Context Healing   — Reconstruct full parent document from chunks
        └─ Returns matchedChunk + sectionTitle + allScores + database identifier
```

---

## 🗂️ Project Structure

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
│   ├── postgres-basic/        # PostgreSQL-only starter project
│   └── polyglot-mode/         # Both providers simultaneously
├── docs/                      # Architecture decision documents (PLAN_01 through PLAN_09)
├── dist/                      # Compiled bytecode output (npm run build)
├── build.js                   # Security compiler (esbuild + bytenode)
└── package.json
```

> See [`/examples`](./examples) for self-contained, runnable projects — copy one into your own repo to get started immediately.

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
  telemetry: true, // Logs events to _manas_telemetry (all configured databases)
  debug: false, // Prints model/profile keys on each operation
});
```

---

## 📖 API Reference

### `absorb(rawText, options?)`

Ingests and indexes a text document.

```javascript
await memory.absorb(text, {
  profile: "balanced", // 'speed' (128d) | 'balanced' (512d) | 'accuracy' (full)
  maxTokens: 100, // Max tokens per chunk (default: 100 ≈ 2 sentences)
  overlapTokens: 20, // Token overlap between adjacent chunks (default: 20)
  precision: "float32", // 'float32' | 'float16' | 'int8' (vector compression)
});
// Returns: { contentId, vectorId, chunks: number }
```

### `recall(query, options?)`

Retrieves semantically matching memories.

```javascript
const results = await memory.recall(query, {
  mode: "qa", // 'document' (chunk recall) | 'qa' (sentence micro-index)
  profile: "balanced",
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
```

---

## 📊 Benchmark

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
  Latency (avg)            310ms              2ms (-100%)
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

> Results vary by cluster tier, embedding model, and dataset size.
> Run `npx manas benchmark` against your own URIs to get precise numbers for your setup.
> Latency numbers exclude embedding API latency and measure retrieval pipeline time only.

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
  "finalScore": 0.938
}
```

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

## 📄 License

ManasDB is released under the **Business Source License 1.1 (BSL 1.1)**.

**You may:**

- ✅ Use ManasDB freely for personal, research, and non-commercial projects
- ✅ Fork, modify, and study the source code
- ✅ Contribute back to this repository

**You may not:**

- ❌ Use ManasDB in a commercial product or SaaS platform without a commercial license
- ❌ Sublicense or resell ManasDB or any derivative SDK

**Change Date:** March 4, 2029 — After this date, ManasDB automatically converts to the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0).

For commercial licensing enquiries, open a [GitHub Discussion](https://github.com/manasdb/manasdb/discussions).

See the full license text in [LICENSE](./LICENSE).

---

## 🤝 Contributing

Contributions are welcome! Please open an issue before submitting a pull request.

```bash
# Clone and install
git clone https://github.com/manasdb/manasdb.git
cd manasdb
npm install

# Run the test suite
npm run test:random

# Run health check
npm run health
```

---

## 🗺️ Roadmap

- [ ] `npx manas ui` — web dashboard for trace visualization
- [ ] Streaming recall support
- [ ] Multi-tenant project isolation API
- [ ] Pluggable reranker (cross-encoder support)
- [ ] Native TypeScript typings package

---

## 💬 The Story Behind ManasDB

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
