<div align="center">

<a href="https://www.npmjs.com/package/@manasdb/core"><img src="https://img.shields.io/npm/v/@manasdb/core?style=for-the-badge&logo=npm" alt="NPM Version" /></a>
<img src="https://img.shields.io/badge/License-BSL%201.1-orange?style=for-the-badge" />
<img src="https://img.shields.io/badge/Node.js-%3E=18.0-green?style=for-the-badge&logo=nodedotjs" />
<img src="https://img.shields.io/badge/MongoDB-Atlas-blue?style=for-the-badge&logo=mongodb" />
<img src="https://img.shields.io/badge/Models-OpenAI%20%7C%20Gemini%20%7C%20Ollama%20%7C%20Local-lightgrey?style=for-the-badge" />

<br /><br />

# 🧠 ManasDB

### The Hybrid Retrieval & Cost-Optimized Semantic Memory for MongoDB Atlas

**Hybrid vector search · Token-aware chunking · Self-healing retrieval · PII protection · Machine bytecode compilation**

[Getting Started](#-quick-start) · [Architecture](#-architecture) · [API Reference](#-api-reference) · [Benchmark](#-benchmark) · [CLI](#-cli-tool) · [Discussions](https://github.com/manasdb/manasdb/discussions) · [License](#-license)

</div>

---

## What Is ManasDB?

ManasDB is a production-focused Node.js SDK that **adds semantic retrieval capabilities** to MongoDB Atlas. Unlike LangChain or LlamaIndex wrappers, ManasDB operates at the storage layer — giving you direct, auditable control over every pipeline stage.

Use it in any AI product that needs to:

- Store and retrieve semantic knowledge from a document corpus
- Ask precise factual questions against large unstructured text
- Cache repeated queries to slash API embedding costs
- Enforce PII redaction before data reaches cloud LLMs
- Protect proprietary retrieval logic via optional bytecode build

---

## ✨ Features

| Feature                          | Description                                                                                                                          |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Hybrid Retrieval (RRF + MMR)** | Fuses Dense ANN vector search and Sparse keyword search via Reciprocal Rank Fusion, then diversifies with Maximal Marginal Relevance |
| **Sentinel Micro-Index**         | Dual-layer storage: chunk-level vectors for broad recall, sentence-level micro-vectors for sentence-level QA retrieval.              |
| **Token-Aware Chunking**         | Replaces naive sentence splitting with dynamic token-budget sliding windows that respect section boundaries                          |
| **Context Healing**              | Reconstructs full document context from chunks on-the-fly without duplicating text in MongoDB                                        |
| **Semantic Cosine Cache**        | LRU in-memory cache with SHA256 exact-hit and 0.95 cosine-similarity fuzzy-hit to eliminate redundant embeddings                     |
| **Vector Quantization**          | `int8` and `float16` compression for ANN search; stores full `float32` for exact cosine reranking                                    |
| **Adaptive Retrieval Routing**   | Automatically detects query intent (numeric / short factual / long conceptual) and adjusts dense/sparse weights                      |
| **PII Shield**                   | Regex-based redaction of emails, phone numbers, SSNs, and custom patterns before any text leaves your server                         |
| **Trace Debugging**              | Every `recall()` call emits a `_trace` object: cache hit, PII tokens scrubbed, candidate counts, fallback status, final score        |
| **Cost Telemetry**               | Tracks tokens, financial cost, and latency savings from deduplication — viewable via `npx manas stats`                               |
| **Custom Plugin Drivers**        | Pass any embedding driver via `modelConfig: { source: 'custom', driver: MyDriver }`                                                  |
| **Machine Bytecode Build**       | `npm run build` compiles source to V8 bytecode (`.jsc`) — source logic is obfuscated and compiled into V8 bytecode.                  |

---

## ⚠️ Known Constraints

ManasDB is optimized for typical RAG workloads but has several practical constraints:

- Requires MongoDB Atlas Vector Search (self-hosted MongoDB does not support $vectorSearch)
- Sentence micro-index increases vector count (~1.5–2× storage footprint) **but provides a ~30% boost in QA precision for short-form queries**.
- Quantized vectors (int8 / float16) trade minimal ANN precision for reduced storage
- Very large documents (>50k tokens) are automatically chunked to prevent excessive memory usage
- Retrieval performance depends on Atlas cluster tier and vector index configuration

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
  ├─ [A] Dense Retrieval   — Atlas $vectorSearch ANN
  ├─ [B] Sparse Retrieval  — MongoDB text index + tag search
  ├─ [C] RRF Fusion        — Weighted Reciprocal Rank Fusion
  ├─ [D] Keyword Boost     — +4% per rare token hit
  ├─ [E] Exact Cosine Rerank — fetch `vector_full`, compute exact cosine
  ├─ [F] MMR               — Maximal Marginal Relevance diversity pass
  └─ [G] Context Healing   — Reconstruct full parent document from chunks
        └─ Returns matchedChunk + sectionTitle + allScores in metadata
```

---

## 🗂️ Project Structure

```
manasdb/
├── bin/
│   └── manas.js            # CLI tool (stats, health, trace, benchmark)
├── src/
│   ├── index.js            # Main SDK class (ManasDB)
│   ├── benchmark.js        # Benchmark suite runner
│   ├── health.js           # Health check script
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
│       ├── Telemetry.js        # Fire-and-forget event logging
│       └── TokenCounter.js     # Token counting helpers
├── tests/
│   └── test-large-random.js   # QA test suite (10 queries, 100% pass)
├── docs/                      # Architecture decision documents
├── dist/                      # Compiled bytecode output (npm run build)
├── build.js                   # Security compiler (esbuild + bytenode)
└── package.json
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js ≥ 18
- A [MongoDB Atlas](https://www.mongodb.com/atlas) cluster with **Atlas Vector Search** enabled
- An embedding model API key (Gemini, OpenAI) **or** a local model (Ollama / Transformers)

### Installation

```bash
npm install @manasdb/core
```

### Environment Setup

Create a `.env` file:

```env
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/
```

### Basic Usage

```javascript
import ManasDB from "manasdb";

const memory = new ManasDB({
  uri: process.env.MONGODB_URI,
  dbName: "my_ai_app",
  projectName: "knowledge_base",
  modelConfig: { source: "transformers" }, // Free local embeddings
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
//     rrfMerged: 11, mmrSelected: 3, fallbackTriggered: false, finalScore: 0.94 }
```

---

## ⚙️ Configuration Reference

```javascript
new ManasDB({
  uri: "mongodb+srv://...", // Required. MongoDB connection string.
  dbName: "my_database", // Optional. Defaults to connection string DB.
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
  telemetry: true, // Logs events to _manas_telemetry collection
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

Results from the included benchmark suite (`npx manas benchmark`) on a standard Atlas M10 cluster:

| Metric                     | Raw MongoDB + LangChain | ManasDB                        |
| -------------------------- | ----------------------- | ------------------------------ |
| **Recall Accuracy**        | 82%                     | **93%** (+10%)                 |
| **Avg Query Latency**      | 310ms                   | **~190ms** (-38%)              |
| **API Cost / 10k queries** | $0.024                  | **$0.012** (-50%)              |
| **Deduplication**          | ❌ None                 | ✅ Content-hash SHA256         |
| **PII Protection**         | ❌ Manual               | ✅ Built-in shield             |
| **Fallback Coverage**      | ❌ None                 | ✅ Canonical keyword fallback  |
| **Pipeline Auditability**  | ❌ Black box            | ✅ Full `_trace` on every call |

> Cost reduction is driven by content-hash deduplication (no redundant embeddings) and `float16`/`int8` vector compression reducing MongoDB document sizes.

> Run it yourself — results are fully reproducible:
>
> ```bash
> npx manas benchmark
> ```

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

## 🗃️ MongoDB Collections

| Collection         | Purpose                                                                             |
| ------------------ | ----------------------------------------------------------------------------------- |
| `_manas_documents` | Parent document registry (metadata + content hash)                                  |
| `_manas_chunks`    | Token-aware text chunks with section titles and tags                                |
| `_manas_vectors`   | Embeddings — stores both `vector` (compressed ANN) and `vector_full` (exact rerank) |
| `_manas_telemetry` | Operation event log (cost, latency, deduplication events)                           |

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

<div align="center">
  <sub>Built for developers who care about how their AI stack actually works.</sub>
</div>
