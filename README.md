<div align="center">

<a href="https://www.npmjs.com/package/@manasdb/core"><img src="https://img.shields.io/npm/v/@manasdb/core?style=for-the-badge&logo=npm" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/package/@manasdb/core"><img src="https://img.shields.io/npm/dw/@manasdb/core?style=for-the-badge&logo=npm&label=Weekly%20Downloads" alt="Weekly Downloads" /></a>
<a href="https://www.npmjs.com/package/@manasdb/core"><img src="https://img.shields.io/npm/dt/@manasdb/core?style=for-the-badge&logo=npm&label=Total%20Downloads" alt="Total Downloads" /></a>
<a href="https://github.com/manasdb/manasdb/stargazers"><img src="https://img.shields.io/github/stars/manasdb/manasdb?style=for-the-badge&logo=github" alt="GitHub Stars" /></a>
<img src="https://img.shields.io/badge/License-Apache%202.0%20%2B%20Commons%20Clause-blue?style=for-the-badge" />
<img src="https://img.shields.io/badge/Node.js-%3E=18.0-green?style=for-the-badge&logo=nodedotjs" />
<img src="https://img.shields.io/badge/MongoDB-Atlas-blue?style=for-the-badge&logo=mongodb" />
<img src="https://img.shields.io/badge/PostgreSQL-pgvector-blue?style=for-the-badge&logo=postgresql" />
<img src="https://img.shields.io/badge/TypeScript-100%25-blue?style=for-the-badge&logo=typescript" />
<img src="https://img.shields.io/badge/Models-OpenAI%20%7C%20Gemini%20%7C%20Ollama%20%7C%20Local-lightgrey?style=for-the-badge" />

<br /><br />

# 🧠 ManasDB

### The Memory Layer for AI Applications

> Built alone, without funding — because every developer I know
> was rebuilding the same fragile RAG pipeline from scratch. There
> had to be a better way.

**ManasDB is the Node.js-native alternative to Mem0** — built in 100% native TypeScript with local
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

---

## 🤝 Works alongside LangChain / LlamaIndex

ManasDB operates at the **storage layer**, not the application layer.
LangChain and LlamaIndex are excellent for chaining LLM calls and
routing agents — ManasDB is the memory backend that plugs into them.
They're complementary, not competing.

---

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

---

## 🚀 Quick Start

### Quickest Start (No API Key Needed)

Use local embeddings + a free MongoDB Atlas cluster:

```bash
npm install @manasdb/core mongodb
```

```javascript
import { ManasDB } from "@manasdb/core";

const memory = new ManasDB({
  uri: process.env.MONGODB_URI,
  modelConfig: { source: "transformers" }, // Free local embeddings — no API key required
});

await memory.init();
await memory.absorb("The James Webb Space Telescope launched on December 25, 2021.");
const results = await memory.recall("When did James Webb launch?");
console.log(results[0].text);
```

> A free MongoDB Atlas cluster is available at [mongodb.com/atlas](https://www.mongodb.com/atlas) — enable Vector Search in the UI (one click).

### Installation

```bash
npm install @manasdb/core

# Then install only the driver(s) for the database you plan to use:
npm install mongodb     # MongoDB Atlas
npm install pg          # PostgreSQL
npm install ioredis     # Optional: Tier 1 Redis semantic caching
```

### Environment Setup

```env
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/
POSTGRES_URI=postgresql://user:password@localhost:5432/vectors
```

Full setup for PostgreSQL-only and Polyglot (Mongo + Postgres + Redis +
hierarchical reasoning) configs — including a longer worked example with
`reasoningRecall()` — is in **[docs/guides/database-setup.md](docs/guides/database-setup.md)**.

---

## ✨ Features

| **Governance & Portability** | ProjectRegistry for multi-tenancy, migrateTo() for provider/model switching, and monthly budget caps. |
| **Observability** | Programmer hooks via onTrace() for production monitoring of tokens, costs, and retrieval internal decisions. |
| **Hybrid Retrieval (RRF + MMR)** | Fuses Dense ANN vector search and Sparse keyword search via Reciprocal Rank Fusion, then diversified with MMR. |

---

---

## 🏗️ Architecture

```
Application → ManasDB → Storage
```

That's the shape you need as a user — `absorb()`/`recall()` and friends
never change regardless of what's underneath. If you're contributing to
ManasDB itself, the real internal architecture (OperationRouter, Runtime,
Pipeline, StorageProvider, adapters) is documented in
**[docs/architecture/](docs/architecture/architecture_overview.md)**,
starting with `architecture_overview.md` and `execution_flow.md`.

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

---

## 🚫 When NOT to Use ManasDB

Being honest about limits builds trust.

- **Billion-scale vector search** — use Pinecone, Milvus, or Weaviate instead; ManasDB is optimised for mid-scale RAG (up to ~10M vectors per project).
- **GPU-accelerated ANN** — ManasDB relies on Atlas `$vectorSearch` and `pgvector`; neither runs on-device GPU cores.
- **Graph traversal / knowledge graphs** — use Neo4j or Amazon Neptune; ManasDB is flat-document oriented.
- **Streaming ingestion at millions of events/sec** — ManasDB is batch/document ingestion, not a streaming pipeline.
- **Already deeply coupled to LangChain memory** — if your stack relies on `ConversationBufferMemory` patterns, adopt ManasDB incrementally.

---

---

## ⚠️ Known Constraints

- Requires MongoDB Atlas Vector Search **or** PostgreSQL with `pgvector` enabled (or both).
- Sentence micro-index increases vector count (~1.5–2× storage) but boosts short-form QA precision ~30%.
- Quantized vectors (`int8` / `float16`) trade minimal ANN precision for reduced storage.
- Documents > 50 K tokens are auto-chunked to prevent excessive memory use.
- Retrieval performance depends on connection latency to your cluster.

---

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

---

## 📚 Further Documentation

The details that used to live directly in this README are now in
`docs/guides/` and `docs/architecture/`, so this page stays a five-minute
read:

| Guide | What's in it |
|---|---|
| [docs/guides/database-setup.md](docs/guides/database-setup.md) | MongoDB-only, PostgreSQL-only, and Polyglot config, with a full worked example |
| [docs/guides/api-reference.md](docs/guides/api-reference.md) | Every public method, signature, and options object |
| [docs/guides/benchmarks.md](docs/guides/benchmarks.md) | Latency/throughput numbers and methodology |
| [docs/guides/configuration.md](docs/guides/configuration.md) | Full `ManasDBConfig` reference |
| [docs/guides/storage-schemas.md](docs/guides/storage-schemas.md) | The actual Mongo/Postgres collection & table shapes |
| [docs/guides/custom-embedding-driver.md](docs/guides/custom-embedding-driver.md) | Plugging in your own embedding provider |
| [docs/guides/security-build.md](docs/guides/security-build.md) | The optional V8-bytecode source-protection build |
| [docs/architecture/](docs/architecture/architecture_overview.md) | Internal architecture — for contributors, not required reading for users |
| [docs/STABILITY.md](docs/STABILITY.md) | What's covered by the public API guarantee, what isn't, and what changes at each semver boundary |
| [docs/DESIGN_PRINCIPLES.md](docs/DESIGN_PRINCIPLES.md) | The principles new contributions are expected to follow, and why each one exists |
| [docs/governance/](docs/governance/ROADMAP.md) | Maintainer-facing: release process, versioning, contributing guidelines, code review checklist, architecture freeze, roadmap |

---

## 🗺️ Roadmap

### Coming soon
- [ ] Elasticsearch adapter
- [ ] `npx manas ui` — web dashboard for trace visualization
- [ ] MySQL + DynamoDB adapters

---

---

## 📋 Changelog

**v0.5.0** — Finalized 100% native TypeScript migration, compiled CLI via esbuild, unified npm scripts with `tsx`.  
**v0.4.7** — Fully removed legacy JS files, shipped native `.d.ts` types, and added Storage Viewer CLI.  
**v0.4.6** — TypeScript Migration Phase 4 (Orchestration, CLI, AI Providers).  
**v0.4.5** — TypeScript Migration Phase 3 (Storage Providers).  
**v0.4.4** — TypeScript Migration Phase 2 (Core Internals).  
**v0.4.3** — TypeScript Migration Phase 1 (Utilities and Core Types).  
**v0.4.2** — Budget Guardrails, Data Migration, ProjectRegistry (Multi-tenancy), Model Dimension Lock, and Zero-Config Bootstrap.  
**v0.4.1** — Added `package-lock.json` to `.gitignore`.  
**v0.4.0** — Telemetry on by default, expanded metrics (retrievalPath, finalScore, savedByCache, sdkVersion, nodeVersion), clearTelemetry() added as explicit method, 2-year TTL index on \_manas_telemetry, Redis Tier 1 caching, Hierarchical Tree Reasoning, benchmark suite, MCP server ([@manasdb/mcp-server](https://www.npmjs.com/package/@manasdb/mcp-server))  
**v0.3.x** — Polyglot broadcasting, PII Shield, Sentinel Micro-Index  
**v0.1-0.2** — Core hybrid retrieval, initial release  

---

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
