# Release Notes - ManasDB

## Version 0.4.2

**Tag:** `v0.4.2`
**Date:** 2026-03-17

### Major Features

- **Zero-Config Onboarding**: Developers can now experiment with ManasDB in 30 seconds. Passing an empty config to `new ManasDB({})` automatically initializes an in-memory storage layer and local CPU embeddings.
- **Compliant Erasure Audit**: `forgetMany()` has been overhauled for GDPR/SOC2 compliance. It now returns an audit object containing timestamps and a breakdown of deletions across the polyglot stack.
- **MMR (Maximal Marginal Relevance) Tuning**: Added a first-class `lambda` parameter to `recall()`. Developers can now prevent "repetitive answers" by increasing diversity in the retrieved context pool.
- **Budget Guardrails**: Never wake up to a surprise bill. Block ingestion and queries before they exceed your monthly cap.
- **Model Lock**: Safety mechanism that prevents querying a collection with the wrong embedding model dimensions.
- **Seamless Migration**: Move your data from MongoDB to Postgres or swap embedding models with a single command.
- **Semantic Pruning**: Bulk deduplication tools to clean up noisy datasets and redundant memories.
- **Observability Hooks**: Subscribe to internal decision traces programmatically for real-time monitoring.

### Robustness & Reliability

- **Failure Modes Documentation**: A dedicated production guide (Category 15) is now available, explaining graceful degradation during database outages, Redis cache downtime, and API rate limiting.
- **Strict Project Isolation**: Hardened the multi-tenancy layer to ensure project-specific deletions (`clearAll`, `forgetMany`) never leak across `projectName` boundaries.

### Enhancements

- **README Hello World**: Added a "30-Second Bootstrap" snippet to the top of the README.
- **Polyglot Deletion Sync**: Ensured that compliance erasure requests are broadcast and verified across all providers in parallel.

### CLI Enhancements

- `npx manas cost-estimate "Hello World"`: Know the cost before you commit.

---

## Version 0.4.1

**Tag:** `v0.4.1`
**Date:** 2026-03-12

### Changed

- **.gitignore**: Added `package-lock.json` to `.gitignore`.

### Major Features

---

## Version 0.4.0

**Tag:** `v0.4.0`
**Date:** 2026-03-10

### Major Features

- **License Transition (Apache 2.0 + Commons Clause)**: Transitioned from BSL 1.1 to a builder-friendly license that preserves open access while protecting against hosted-service competition and SDK rebranding.
- **Enhanced ROI Telemetry**: Telemetry is now enabled by default, tracking performance metrics (saved tokens, latency, cost) natively within your own database. No private data ever leaves your server.
- **Tier 1 Redis Semantic Cache**: Introduced a production-grade external persistent cache using `ioredis` to complement the existing in-process LRU cache.
- **Hierarchical Tree Reasoning (`TreeIndex`)**: Implemented `reasoningRecall()` method that parses document chunks into a node hierarchy (`document` → `section` → `leaf`) to accurately slice very large contexts.
- **Universal Polyglot Schema (`SearchFormatter`)**: Normalized all database responses (MongoDB and Postgres) into one identical output schema contract for seamless integration.

### Enhancements & UI Polish

- **README Narrative Rewrite**: Complete overhaul of the README focusing on the "Why", including a 10-second demo at the top and a story-based introduction.
- **Telemetry Lifecycle**: Added `memory.clearTelemetry()` for explicit data management and a 2-year TTL index for automated metadata cleanup.
- **PII Filtering for Metrics**: Expanded telemetry events (`retrievalPath`, `finalScore`, `sdkVersion`) while ensuring zero PII is recorded in the trace logs.
- **Financial Cost Telemetry (`CostCalculator`)**: Integrated token estimation and USD cost calculations natively into the indexing and recall pipelines.
- **Project Structure & UX**: Collapsed the detailed project tree under a `<details>` tag and optimized the section order for better onboarding.
- **Cache-Bypass for Short Queries**: Logic to instantly route queries of 2 words or less directly to databases, bypassing the cache TCP overhead.
- **Lazy-Loaded Provider Factory**: Redis (`ioredis`) is now lazy-loaded, ensuring zero performance impact for users not using the caching layer.

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
