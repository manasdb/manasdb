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
embeddings, full data privacy, up to 29x faster repeated queries, and
MCP-native integration out of the box.

No cloud lock-in. No API key required to start. Your data never
leaves your server.

[Quick Start](#-quick-start) · [Features](#-features) · [Architecture](#️-architecture) · [Benchmarks](#-benchmarks) · [CLI](#️-cli-tool) · [Telemetry](#-telemetry) · [Documentation](#-documentation-index) · [Roadmap](#️-roadmap) · [Discussions](https://github.com/manasdb/manasdb/discussions) · [License](#-license)

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

### 🚀 Hello World (30-Second Bootstrap)

Zero configuration — no database, no environment variables, no API keys required:

```bash
npm install @manasdb/core
```

```javascript
import { ManasDB } from "@manasdb/core";

const memory = new ManasDB({}); // Default: in-memory storage + local embeddings
await memory.init();

await memory.absorb("ManasDB is a Node.js-native memory layer.");
const [result] = await memory.recall("What is ManasDB?");

console.log(result.text);
// → "ManasDB is a Node.js-native memory layer."
```

---

## 🚀 Quick Start

### Quickest Start (No API Key Needed)

Local embeddings + a free MongoDB Atlas cluster:

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

### Moving to Production

Zero-config is great for prototypes, but the default `MemoryProvider` has real limits: data is lost on restart, performance degrades above ~5,000 vectors, and deduplication is content-hash-only. Move to production by providing a persistent database URI:

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
ManasDB SDK
    ├── Cache — Tier 1 Redis (semantic) + Tier 2 in-memory LRU
    ├── Hybrid Retrieval — Hierarchical Tree Reasoning, RRF + MMR reranking
    ├── PII Shield — per-field redaction on write and read
    ├── Telemetry & Budgeting — monthly USD caps, per-query cost tracking
    ├── Model Dimension Lock — prevents silent index corruption on model swaps
    └── Vector Normalization — parity across providers
    ↓
    ├── MongoDB Atlas  ($vectorSearch + full-text)
    ├── PostgreSQL     (pgvector + tsvector)
    ├── Redis          (Tier 1 semantic cache)
    └── In-Memory      (zero-config / tests)
```

The result: **better accuracy, fewer services, lower cost, fully auditable pipelines** — without rewriting your application.

---

## 🆚 ManasDB vs Mem0

| Feature          | Mem0                 | ManasDB                        |
| ---------------- | --------------------- | ------------------------------- |
| Language          | Python-first          | Node.js native ✅               |
| Local embeddings  | ✗                     | ✅ Ollama / Transformers        |
| Data privacy      | Sends to their cloud  | Stays on your server ✅         |
| MCP native        | Partial               | ✅ Working today                |
| Hybrid search     | Limited               | ✅ RRF + MMR built-in           |
| Redis caching     | ✗                     | ✅ Up to 29x faster repeated queries |
| Tree Reasoning    | ✗                     | ✅ Native `reasoningRecall()`   |
| PII protection    | ✗                     | ✅ Built-in per-field           |
| Trace debugging   | ✗                     | ✅ Every `recall()`             |
| Telemetry         | Sends to their cloud  | Your DB only ✅                 |

## 🤝 Works alongside LangChain / LlamaIndex

ManasDB operates at the **storage layer**, not the application layer. LangChain and LlamaIndex are excellent for chaining LLM calls and routing agents — ManasDB is the memory backend that plugs into them. They're complementary, not competing.

## 🌐 Why Use Multiple Databases?

Polyglot broadcasting — writing to both MongoDB and PostgreSQL simultaneously — isn't about redundancy for its own sake:

| Scenario                          | How Polyglot Helps                                    |
| ---------------------------------- | -------------------------------------------------------|
| **Database Migration**             | Run both in parallel; flip traffic when confident       |
| **Cross-Region Replication**       | Mongo Atlas in US-East, Postgres in EU-West for GDPR    |
| **Hybrid Storage Strategy**        | Hot semantic data on Mongo, cold archival on Postgres   |
| **Retrieval Engine Benchmarking**  | Query both, compare scores, decide which to keep        |
| **Disaster Recovery**              | One provider down → SDK falls back to the other         |

For single-database deployments a single `uri` is enough — multi-DB is opt-in. Full config in [docs/guides/database-setup.md](docs/guides/database-setup.md).

## 🔌 MCP Integration (Claude Desktop & Cursor)

Give Claude Desktop or Cursor **permanent memory** across all conversations in 60 seconds:

```bash
npx @manasdb/mcp-server setup
```

→ See [@manasdb/mcp-server](https://github.com/manasdb/mcp-server) for the full Claude Desktop + Cursor setup guide.

---

## ✨ Features

| Feature | What it does |
| --- | --- |
| **Hybrid Retrieval (RRF + MMR)** | Fuses dense ANN vector search and sparse keyword search via Reciprocal Rank Fusion, then diversifies results with MMR. |
| **Hierarchical Tree Reasoning** | `reasoningRecall()` — chunked, section-aware retrieval for complex multi-part questions, not just nearest-neighbor lookup. |
| **Redis Tier 1 + In-Memory Tier 2 Caching** | Semantic cache in front of every provider — up to 29x faster on repeated/similar queries (see [Benchmarks](#-benchmarks)). |
| **PII Shield** | Per-field redaction on write and read, configurable custom rules. |
| **Telemetry & Budget Guardrails** | Monthly USD cost caps, per-query cost/latency tracking — see [Telemetry](#-telemetry). |
| **Polyglot Storage** | Broadcast writes across MongoDB + PostgreSQL simultaneously; query both, fail over automatically. |
| **Governance & Portability** | `ProjectRegistry` for multi-tenancy, `migrateTo()` for provider/model switching without downtime. |
| **Observability** | `onTrace()` hooks for production monitoring of tokens, costs, and retrieval decisions; `npx manas trace` for ad-hoc debugging. |
| **Model Dimension Lock** | Anti-corruption guard — detects and safely handles embedding model swaps instead of silently mixing incompatible vectors. |
| **Zero-Config Bootstrap** | `new ManasDB({})` works out of the box — in-memory storage, local CPU embeddings, no external services. |
| **TypeScript-First SDK** | 100% native TypeScript, typed public methods and options — see [docs/STABILITY.md](docs/STABILITY.md). |

---

## 🏗️ Architecture

```
Application → ManasDB → Storage
```

That's the shape you need as a user — `absorb()`/`recall()` and friends never change regardless of what's underneath (see [docs/STABILITY.md](docs/STABILITY.md)). If you're contributing to ManasDB itself, the real internal architecture — `OperationRouter`, `Runtime`, `Pipeline`, `StorageProvider`, adapters — is documented in **[docs/architecture/](docs/architecture/architecture_overview.md)**, starting with `architecture_overview.md` and `execution_flow.md`. Building an extension (adapter, middleware, intent, scheduler job)? Start at **[src/sdk/plugin-sdk.ts](src/sdk/plugin-sdk.ts)** and [docs/architecture/extension_points.md](docs/architecture/extension_points.md).

## 🎯 Real-World Use Cases

| Industry                 | Use Case                                                          |
| ------------------------- | ------------------------------------------------------------------|
| **Customer Support**      | AI chatbot that answers from your product docs + ticket history   |
| **Developer Tools**       | Semantic search over API references and changelogs                |
| **Legal / Compliance**    | Clause retrieval from contracts with PII auto-redaction           |
| **Healthcare**            | Patient-record Q&A with strict PII Shield enabled                 |
| **E-commerce**            | Product recommendation from natural-language intent               |
| **Enterprise Knowledge**  | Internal wiki search that understands context, not just keywords  |
| **EdTech**                | Curriculum-aware Q&A that cites exact lesson passages              |

ManasDB is optimised for **10K – 10M vectors**. Typical deployment: a monorepo Node.js backend, one Mongo Atlas free/shared cluster, and a managed Postgres instance.

## 🚫 When NOT to Use ManasDB

Being honest about limits builds trust.

- **Billion-scale vector search** — use Pinecone, Milvus, or Weaviate instead; ManasDB is optimised for mid-scale RAG (up to ~10M vectors per project).
- **GPU-accelerated ANN** — ManasDB relies on Atlas `$vectorSearch` and `pgvector`; neither runs on-device GPU cores.
- **Graph traversal / knowledge graphs** — use Neo4j or Amazon Neptune; ManasDB is flat-document oriented.
- **Streaming ingestion at millions of events/sec** — ManasDB is batch/document ingestion, not a streaming pipeline.
- **Already deeply coupled to LangChain memory** — if your stack relies on `ConversationBufferMemory` patterns, adopt ManasDB incrementally.

## ⚠️ Known Constraints

- Requires MongoDB Atlas Vector Search **or** PostgreSQL with `pgvector` enabled (or both).
- Sentence micro-index increases vector count (~1.5–2× storage) but boosts short-form QA precision ~30%.
- Quantized vectors (`int8` / `float16`) trade minimal ANN precision for reduced storage.
- Documents > 50K tokens are auto-chunked to prevent excessive memory use.
- Retrieval performance depends on connection latency to your cluster.

---

## 📊 Benchmarks

Full methodology, more query types, and the raw `npx manas benchmark` sample output are in **[docs/guides/benchmarks.md](docs/guides/benchmarks.md)**. Headline numbers:

**Redis Tier 1 Cache vs. native database search** (hierarchical tree reasoning):

| Query Type (MongoDB) | Native Tree Search | Redis Tier 1 Cache | Speedup |
| --- | --- | --- | --- |
| Complex QA | ~120 ms | ~4 ms | **29.0x faster** |
| Short factual | ~3.2 ms | ~4.2 ms | Bypassed* |

| Query Type (PostgreSQL) | Native Tree Search | Redis Tier 1 Cache | Speedup |
| --- | --- | --- | --- |
| Complex QA | ~111 ms | ~12 ms | **9.0x faster** |
| Short factual | ~3.3 ms | ~8.6 ms | Bypassed* |

\* Queries under 3 words route directly to the native database — Postgres/MongoDB already answer these in <4ms, so the Redis round-trip would add overhead rather than save it.

**ManasDB vs. a raw/unoptimized stack** (same embedding model, no caching or dedup):

| Metric | Raw Stack | ManasDB (MongoDB) | ManasDB (PostgreSQL) |
| --- | --- | --- | --- |
| Absorb time | 1200 ms | 673 ms | 65 ms |
| Recall latency (avg) | 310 ms | 9 ms (**-97%**) | 2 ms (**-99%**) |
| API cost per 10K ops | $0.024 | $0.012 (**-50%**) | $0.012 (**-50%**) |
| Recall accuracy | 82.4% | 91.2% (**+8.8%**) | 91.8% (**+9.4%**) |
| Dedup / cache | None | SHA256 + cosine LRU | SHA256 + cosine LRU |
| PII protection | Manual | Built-in, per-field | Built-in, per-field |

Run it against your own cluster: `npx manas benchmark` (auto-detects `MONGODB_URI`/`POSTGRES_URI` and reports Mongo-only, Postgres-only, and polyglot sections). For regression tracking across releases, see `npm run bench` / `npm run bench:baseline` and [docs/governance/RELEASE_PROCESS.md](docs/governance/RELEASE_PROCESS.md).

---

## 🛠️ CLI Tool

```bash
npx manas health      # MongoDB/Postgres connection and index status
npx manas stats       # ROI dashboard — token savings, cost reduction, dedup stats
npx manas trace "..."  # Visual trace debugger — shows exactly how a query was resolved
npx manas benchmark   # Run the full benchmark suite against your own cluster
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

ManasDB records operational metrics to `_manas_telemetry` in **your own database** — this data never leaves your server.

| Field | What it stores |
| --- | --- |
| `durationMs` | Query execution time |
| `cacheHit` | Whether Redis/LRU cache served the result |
| `retrievalPath` | Which retrieval strategy was used |
| `finalScore` | Top cosine similarity score |
| `tokens` | Embedding tokens consumed |
| `costUSD` | Estimated API cost |
| `savedByCache` | Cost saved by cache hit |
| `queryLengthBucket` | short / medium / long (never the query text) |
| `sdkVersion` | ManasDB version in use |
| `nodeVersion` | Node.js runtime version |

**Never stored:** query text, document content, vectors, or any PII.

This powers `npx manas stats`, `npx manas ui`, and the trace debugger. Telemetry is **on by default**. To opt out:

```javascript
new ManasDB({ uri: process.env.MONGODB_URI, telemetry: false });
```

> **A note on the future:** ManasDB Cloud will offer an opt-in feature to contribute anonymized performance gradients (never content, never vectors — only behavioral math like score distributions and retrieval paths) to improve retrieval intelligence across all agents. This will always be explicitly opt-in, clearly documented, and auditable before enabling.

## 💡 Supported Embedding Providers

| Provider | `source` value | Model Examples | Cost |
| --- | --- | --- | --- |
| Local Transformers | `transformers` | `all-MiniLM-L6-v2` | Free |
| Ollama | `ollama` | `nomic-embed-text` | Free (self-hosted) |
| OpenAI | `openai` | `text-embedding-3-small` | ~$0.02/1M tokens |
| Google Gemini | `gemini` | `gemini-embedding-001` | ~$0.10/1M tokens |
| Custom / air-gapped | `custom` | Any driver implementing `embed()` | Varies |

Building your own: [docs/guides/custom-embedding-driver.md](docs/guides/custom-embedding-driver.md).

## 🏢 Enterprise Readiness

- **10M+ Vectors** — vector indexing scalability is handled by MongoDB Atlas `$vectorSearch` (HNSW); Atlas clusters commonly support tens of millions of vectors depending on cluster tier.
- **Index Stability** — prevents duplicate index creation natively; detects embedding-model swaps and provides a safety-gated `npx manas index-prune` command.
- **No Data Leaks** — telemetry writes strictly to `_manas_telemetry` on *your own* cluster; zero text or PII is ever logged, only operational metrics.
- **Concurrency Safety** — reads (`recall`) are stateless; writes (`absorb`) use atomic `$setOnInsert` upserts to prevent vector duplication under race conditions.
- **Bounded Memory** — hard caps on reranking (`fetchLimit: 200`), context-healing (100 chunks/doc), and batched, garbage-collected sentence ingestion.

---

## 📖 Documentation Index

This README is a five-minute tour. Everything else lives in `docs/`:

### For users
| Guide | What's in it |
| --- | --- |
| [docs/guides/database-setup.md](docs/guides/database-setup.md) | MongoDB-only, PostgreSQL-only, and Polyglot config, with a full worked example |
| [docs/guides/api-reference.md](docs/guides/api-reference.md) | Every public method, signature, and options object |
| [docs/guides/benchmarks.md](docs/guides/benchmarks.md) | Full latency/throughput numbers and methodology |
| [docs/guides/configuration.md](docs/guides/configuration.md) | Full `ManasDBConfig` reference |
| [docs/guides/storage-schemas.md](docs/guides/storage-schemas.md) | The actual Mongo/Postgres collection & table shapes |
| [docs/guides/custom-embedding-driver.md](docs/guides/custom-embedding-driver.md) | Plugging in your own embedding provider |
| [docs/guides/security-build.md](docs/guides/security-build.md) | The optional V8-bytecode source-protection build |
| [docs/PLAN_13_FAILURE_MODES.md](docs/PLAN_13_FAILURE_MODES.md) | Retry/backoff, failover, and recovery patterns |

### For contributors
| Doc | What's in it |
| --- | --- |
| [docs/architecture/](docs/architecture/architecture_overview.md) | Internal architecture — start with `architecture_overview.md` and `execution_flow.md` |
| [src/sdk/plugin-sdk.ts](src/sdk/plugin-sdk.ts) | The one barrel import for building an adapter, middleware, intent, or scheduler job |
| [docs/architecture/extension_points.md](docs/architecture/extension_points.md) | The five sanctioned ways to extend ManasDB |
| [docs/architecture/dependency_graph.md](docs/architecture/dependency_graph.md) | Which internal modules may import which |
| [docs/DESIGN_PRINCIPLES.md](docs/DESIGN_PRINCIPLES.md) | The principles new contributions are expected to follow, and the real bug/regression behind each one |
| [docs/STABILITY.md](docs/STABILITY.md) | Exactly what's covered by the public API guarantee, what isn't, and what changes at each semver boundary |
| [docs/adr/](docs/adr/) | Architecture Decision Records — 0001–0008, one per significant internal decision |

### For maintainers
| Doc | What's in it |
| --- | --- |
| [docs/governance/RELEASE_PROCESS.md](docs/governance/RELEASE_PROCESS.md) | What CI actually runs, and the pre-merge/release checklists |
| [docs/governance/VERSIONING.md](docs/governance/VERSIONING.md) | How to decide patch vs. minor vs. major |
| [docs/governance/CONTRIBUTING_GUIDELINES.md](docs/governance/CONTRIBUTING_GUIDELINES.md) | What makes a PR mergeable |
| [docs/governance/CODE_REVIEW_CHECKLIST.md](docs/governance/CODE_REVIEW_CHECKLIST.md) | Reviewer checklist — each item cites the real bug that motivated it |
| [docs/governance/ARCHITECTURE_FREEZE.md](docs/governance/ARCHITECTURE_FREEZE.md) | What's frozen, what isn't, and what needs an ADR |
| [docs/governance/ROADMAP.md](docs/governance/ROADMAP.md) | What's actually next, and known gaps tracked rather than hidden |

---

## 🗺️ Roadmap

### Coming soon (product)
- [ ] Elasticsearch adapter
- [ ] `npx manas ui` — web dashboard for trace visualization
- [ ] MySQL + DynamoDB adapters

### Coming later (architecture)
- [ ] Migrate `absorb`/`recall` to the Runtime path for real (see [docs/architecture/execution_flow.md](docs/architecture/execution_flow.md))
- [ ] Capability discovery — `storage.supports("HybridSearch")` instead of type-checking the provider (proposed in [ADR-0008](docs/adr/0008-capability-discovery.md))

Full internal roadmap, including known gaps like the untyped test suite and the missing benchmark baseline: [docs/governance/ROADMAP.md](docs/governance/ROADMAP.md).

---

## 📋 Changelog

**v0.6.0** — "The Runtime Foundation." New layered Runtime architecture (Kernel, Pipeline, OperationRouter, StorageProvider, RuntimeBuilder) underneath an unchanged public API; official Plugin SDK; fixed a SQL injection and a silent table-name mismatch; full architecture/governance documentation set. Zero breaking changes — see [CHANGELOG.md](CHANGELOG.md) for the complete, categorized entry.
**v0.5.0** — Finalized 100% native TypeScript migration, compiled CLI via esbuild, unified npm scripts with `tsx`.
**v0.4.7** — Fully removed legacy JS files, shipped native `.d.ts` types, and added Storage Viewer CLI.
**v0.4.6** — TypeScript Migration Phase 4 (Orchestration, CLI, AI Providers).
**v0.4.5** — TypeScript Migration Phase 3 (Storage Providers).
**v0.4.4** — TypeScript Migration Phase 2 (Core Internals).
**v0.4.3** — TypeScript Migration Phase 1 (Utilities and Core Types).
**v0.4.2** — Budget Guardrails, Data Migration, ProjectRegistry (Multi-tenancy), Model Dimension Lock, and Zero-Config Bootstrap.
**v0.4.1** — Added `package-lock.json` to `.gitignore`.
**v0.4.0** — Telemetry on by default, expanded metrics, Redis Tier 1 caching, Hierarchical Tree Reasoning, benchmark suite, MCP server ([@manasdb/mcp-server](https://www.npmjs.com/package/@manasdb/mcp-server)).
**v0.3.x** — Polyglot broadcasting, PII Shield, Sentinel Micro-Index.
**v0.1–0.2** — Core hybrid retrieval, initial release.

Full, categorized history: [CHANGELOG.md](CHANGELOG.md).

---

## 🤝 Contributing

If ManasDB saves you time, consider supporting development:

[![Support ManasDB](https://img.shields.io/badge/Support-ManasDB-%230066CC?style=for-the-badge&logo=razorpay&logoColor=white)](https://razorpay.me/@manasdb)

Contributions are welcome via PRs — please open an issue first. Before your first PR, skim [docs/governance/CONTRIBUTING_GUIDELINES.md](docs/governance/CONTRIBUTING_GUIDELINES.md) and [docs/architecture/extension_points.md](docs/architecture/extension_points.md).

```bash
# Clone and install
git clone https://github.com/manasdb/manasdb.git
cd manasdb
npm install

# Build, typecheck, and run the safety-net test suite (what CI runs)
npm run build && npm run typecheck && npm run test:safety-net

# Run health check
npm run health
```

---

## 📄 License

**Core SDK (`@manasdb/core`)**: Apache 2.0 + Commons Clause

Free for all use — personal, commercial, production — **unless** your product is ManasDB itself (hosting, reselling, or repackaging ManasDB as your primary offering).

| Use Case | Free |
| --- | --- |
| Building an app that uses ManasDB as a dependency | ✅ Yes |
| Using ManasDB in your company's production systems | ✅ Yes |
| Open source projects | ✅ Yes |
| Research and education | ✅ Yes |
| Offering hosted ManasDB as a service to others | ❌ License required |
| Reselling or repackaging ManasDB as your product | ❌ License required |

> **The simple test:** Are you selling ManasDB, or something you built using ManasDB? If you built something WITH it → free, always. If you're selling ManasDB itself → contact us.

→ See [COMMERCIAL_LICENSE.md](./COMMERCIAL_LICENSE.md) for full details. For commercial licensing, open a [GitHub Discussion](https://github.com/manasdb/manasdb/discussions).

**ManasDB Cloud + Dashboard**: Commercial License
**Enterprise features**: Commercial License

---

## 💬 The Story Behind ManasDB

I built this alone, without funding, after watching every developer I know rebuild the same fragile RAG pipeline from scratch — including myself.

ManasDB started as an experiment to simplify production RAG pipelines. Most vector databases provide fast ANN search. But real AI systems also need hybrid retrieval (dense + sparse), reranking, semantic caching, deduplication, PII filtering, cost tracking, and cross-provider consistency — pieces that must be built from scratch in every project.

Instead of wiring these pieces together at the application layer, ManasDB moves them directly into the storage layer — so your application stays clean and the retrieval intelligence lives where the data lives.

The result is a single SDK that handles the full memory lifecycle: ingest → chunk → embed → deduplicate → store → cache → retrieve → heal → audit. 0.6.0 rebuilt how that SDK is put together internally — a layered Runtime instead of one large class — without changing a single line application code has to call. That's the bet: the outside stays simple while the inside gets to keep evolving.

---

<div align="center">
  <sub>Built for developers who care about how their AI stack actually works.</sub>
</div>
