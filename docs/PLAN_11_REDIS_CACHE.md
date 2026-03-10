# PLAN 11: Tier-1 Redis Semantic Caching

## 1. Context & Motivation

Retrieval-Augmented Generation (RAG) applications frequently experience redundant queries. Users often ask slight variations of previously answered questions, such as _"What is the refund policy?"_ vs _"How do I get a refund?"_

In ManasDB versions prior to v0.4.0, a simple in-memory LRU cache served as a "Tier 2" cache. However, this in-memory cache drops data upon server restarts and is completely isolated across horizontally scaled server instances.

To enable **durable, cross-instance, sub-millisecond semantic retrieval**, we introduced an opt-in **Tier 1 Redis Semantic Cache**.

## 2. Core Architecture

### Two-Tier Caching System

ManasDB now utilizes a deterministic two-tier caching architecture during the `recall()` phase:

1. **Tier 1: Redis Semantic Cache (`RedisProvider`)**
   - **Persistence:** Shared across all Node.js instances via an external Redis instance.
   - **Lookup Logic:** Scans all cached vector entries for a Cosine Similarity match that meets or exceeds the user-configured `semanticThreshold` (default: `0.92`).
   - **Short-circuit:** If matched, the result is immediately returned, skipping standard DB execution and heavy context-stitching JOINs. The telemetry `_trace.cacheHit` evaluates to `'redis'`.
2. **Tier 2: In-Memory LRU Cache (`MemoryEngine`)**
   - **Persistence:** Volatile, local to current Node.js process.
   - **Lookup Logic:** Uses an exact SHA-256 hash match, or a very strict `0.95` fuzzy cosine check.
   - **Short-circuit:** If matched, `_trace.cacheHit` evaluates to `'memory'`.

3. **Backend Database:**
   - If both caches miss, the query proceeds to either MongoDB (`$vectorSearch`) or PostgreSQL (`pgvector`), triggering heavy retrieval, potential Context-Healing (if `mode: 'document'`), and reranking. The final result is served and asynchronously synced back to warm the Tier-1 Redis cluster.

## 3. Real-World Benchmarking

To prove exactly why this cache is necessary for production, we authored a suite of large-document multi-query benchmarks (`/examples/postgres-redis/benchmark-large.js`).

When requesting the database to resolve `mode: 'document'` queries, the backend DB must run complex multi-table JOINs (fetching the dense vectors, matching chunks, discovering sibling chunks via `document_id`, joining texts, and reconstructing the paragraph).

**Benchmark Results:**

| Query | Postgres Vector+JOIN (ms) | Redis Cache Hit (ms) | Improvement          |
| ----- | ------------------------- | -------------------- | -------------------- |
| Q1    | 105.12ms                  | 2.15ms               | 48.9x Faster (98.0%) |
| Q2    | 89.44ms                   | 1.95ms               | 45.9x Faster (97.8%) |
| Q3    | 92.11ms                   | 1.85ms               | 49.8x Faster (98.0%) |
| Q4    | 110.05ms                  | 2.01ms               | 54.8x Faster (98.2%) |

By placing Redis in front of the database, the heavy read-path of Context-Healing is bypassed entirely, reducing database compute pressure and returning payload answers in `< 3ms`.

### Hierarchical Tree Reasoning Benchmarking

In v0.5.0, caching was also deeply integrated into `reasoningRecall()`. Tree-based retrieval requires massive document parsing into `document → section → leaf` relationships.

When testing `examples/postgres-redis/benchmark-reasoning.js`:

| Query            | Tree Search (Native Postgres) | Redis Tier 1 Cache | Improvement         |
| ---------------- | ----------------------------- | ------------------ | ------------------- |
| Q1 (Complex QA)  | 111.62ms                      | 12.44ms            | 9.0x Faster (88.9%) |
| Q2 (Short query) | 3.37ms                        | 8.69ms             | Bypassed\*          |
| Q3 (Short query) | 3.53ms                        | 3.98ms             | Bypassed\*          |

> **The Short Query Cache Bypass**: During the v0.5.0 update, we discovered short, literal queries (under 3 words) are natively extremely fast in Postgres/Mongo ( ~3ms ). Adding a Redis cache fetch introduced a ~4ms TCP hop penalty. ManasDB now intelligently bypasses Redis entirely for these tiny queries, routing directly to the DB to prevent performance regressions.

## 4. Design Decisions

- **Lazy Loading**: `RedisProvider` only `import('ioredis')` at initialization. This ensures developers who don't want Redis are never forced to install `ioredis` in their project or download unnecessary dependencies.
- **Fail-Safe Mechanism**: Redis gracefully degrades. If the cluster goes offline, the scan returns `null` silently, allowing `recall()` to seamlessly route to the backend database so the user never observes a 500 API crash.
- **Provider Interface**: Unlike `MongoProvider` and `PostgresProvider`, `RedisProvider` does not extend `BaseProvider`. This enforces strict typing that Redis is a volatile cache layer, not a permanent document store capable of servicing `absorb()` vector writes.
