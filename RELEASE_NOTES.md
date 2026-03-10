# Release Notes

## Version 0.4.0

**Tag:** `v0.4.0`
**Date:** 2026-03-10

### Major Features

- **Tier 1 Redis Semantic Cache**: Introduced a production-grade external persistent cache using `ioredis` to complement the existing in-process LRU cache.
- **Hierarchical Tree Reasoning (`TreeIndex`)**: Implemented `reasoningRecall()` method that parses document chunks into a node hierarchy (`document` → `section` → `leaf`) to accurately slice very large contexts.
- **Two-Tier Caching Strategy**: Semantic queries check Redis before falling back to Memory. Both caches respect exact-match SHA256 hashes and fuzzy-match cosine_similarity >= 0.95.

### Enhancements

- **Cache-Bypass for Ultra-Short Queries**: Added logic to instantly route queries of 2 words or less directly to databases to prevent TCP cache-fetch overhead.
- **Reasoning Cache Short-circuit**: `reasoningRecall()` result payloads are now instantly cached in Tier 1 and Tier 2, offering up to 100x performance improvements for recurring tree searches.
- **Lazy-Loaded Cache Provider**: Redis (`ioredis`) is implemented via the `ProviderFactory` lazy-loading architecture. It will only be imported and instantiated if `cache: { provider: 'redis' }` is explicitly configured, ensuring zero bloat or crash-risk for users relying purely on MongoDB or Postgres.
- **Financial Cost Telemetry (`CostCalculator`)**: Integrated token estimation and USD cost calculations natively into `absorb()` and the `_trace` responses of all indexing operations.
- **Universal Polyglot Schema (`SearchFormatter`)**: Centralized and sanitized all raw database returns (MongoDB and Postgres) into one identical output schema contract before hitting the caller loop.
- New benchmarking scripts for measuring Redis caching overhead vs DB vector search (`examples/mongodb-redis/benchmark-reasoning.js`, `examples/postgres-redis/benchmark-reasoning.js`).

---

## Version 0.3.2

**Tag:** `v0.3.2`
**Date:** 2026-03-09

### Major Features

- **PostgresProvider (`pgvector`)**: Fully functional PostgreSQL driver using `pgvector` allowing 100% feature-parity with MongoDB.
- **Polyglot Broadcasting Mode**: Enable simultaneous insertion and retrieval across both MongoDB and PostgreSQL simultaneously using `databases: [{...}, {...}]`.
- **Lazy-Loading `ProviderFactory`**: Database connection drivers (`pg`, `mongodb`) are now lazy-loaded dynamically ONLY when required, avoiding "missing module" crashes for unutilized databases.

### Enhancements

- Implemented **Strict Mode**: the SDK now fails fast if zero database providers are present when querying `absorb()` or `recall()`.
- Centralized Telemetry (`Telemetry.js`) to support concurrent metrics collection from multi-database deployments.

---

## Version 0.3.1

**Tag:** `v0.3.1`
**Date:** 2026-03-08

### Bug Fixes

- Rebuilt Bytecode compiler (`bytenode`) logic to resolve broken `node:crypto` imports leading to missing modules in strict ESM bundles (Vite / Next.js).
- Corrected internal table references in PostgreSQL tests causing chunks query SQL failures.
- Addressed UNIQUE constraint BSON ObjectId collision between chunks and vectors in SQL `PostgresProvider`.

---

## Version 0.3.0

**Tag:** `v0.3.0`
**Date:** 2026-03-05

### Major Features

- **Context Healing Engine**: Implemented cross-chunk concatenation to recreate parent text without storing monolithic blobs on every DB record.

### Enhancements

- Shifted chunk contents natively into `_manas_chunks` rather than storing duplicate text within the `_manas_vectors` index.

---

## Version 0.2.0

**Tag:** `v0.2.0`
**Date:** 2026-02-28

### Major Features

- **Token-Aware Chunking**: Replacing naive sentence-splitting. Implemented overlapping dynamic context sliding windows.
- **Adaptive Retrieval Routing**: Dynamically scales vector vs sparse weights based on incoming NLP classifications (numeric exact vs deep semantics).
- **Sentinel Micro-Index Mode**: Broad recall matched instantly with per-sentence micro-embeddings.

---

## Version 0.1.0

**Tag:** `v0.1.0`
**Date:** 2026-02-01

### Major Features

- Initial Release of the ManasDB core package.
- Intelligent Hybrid Retrieval (RRF + MMR) over MongoDB Atlas Vector Search.
- PII Shield Engine allowing regex sanitization of private data before generation embeddings.
