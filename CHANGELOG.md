# Changelog

All notable changes to the ManasDB project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.2] - 2026-03-17

### Added

- **Zero-Config Bootstrap**: Introduced `MemoryProvider`. ManasDB now boots instantly without a database URI or API key by defaulting to in-memory storage and local embeddings.
- **GDPR-Centric Erasure Audit**: The `forgetMany(query)` method now returns a detailed audit trail including timestamps, counts, and searched providers, facilitating regulatory compliance reporting.
- **MMR Diversity Control**: Added `lambda` parameter to `recall()` allowing developers to tune the balance between semantic relevance (repetition) and result diversity.
- **Robustness Documentation**: Added `PLAN_13_FAILURE_MODES.md` and UI Category 15 detailing engine behavior during DB outages, API rate limits, and Redis failures.
- **Hello World Snippet**: Added a 3-line rapid-start demo to the README for friction-less onboarding.
- **Governance & Budgeting**: `budgetConfig` in constructor and pre-flight cost estimation logic.
- **Model Dimension Lock**: Dimension mismatch detection in `init()` to prevent corrupted queries.
- **Data Migration**: `ManasDB.migrateTo()` for switching databases or embedding models with re-embedding support.
- **Memory Lifecycle**: `expireOlderThan(duration)` for TTL-based cleanup and `dedup(options)` for semantic pruning.
- **Observability**: Programmatic `onTrace(callback)` hook for production monitoring.
- **CLI Enhancements**: `npx manas cost-estimate <text>` command for pre-flight planning.
- **Multi-Tenancy**: `ProjectRegistry` utility for managing isolated project instances.
- **Robustness**: Moved budget checks to pre-flight to prevent unnecessary API costs.

### Fixed

- **Project-Scoped Deletions**: Resolved critical bugs in `MongoProvider.deleteMany` and `ManasDB.clearAll()` where data from other projects could be inadvertently cleared.
- **Polyglot Consistency**: Fixed `forgetMany` behavior to ensure deletions are broadcasted correctly to all configured providers in polyglot mode.
- **MemoryProvider Integration**: Corrected method signature mismatches between the new `MemoryProvider` and the core `MemoryEngine`.
- **Trace Payload**: Comprehensive JSON trace including query vectors, nodes, tokens, and duration.
- **MemoryProvider**: Added `getMonthlySpend` shim for budget compatibility.

## [0.4.1] - 2026-03-12

### Changed

- **.gitignore**: Added `package-lock.json` to `.gitignore`.

## [0.4.0] - 2026-03-10

### Added

- **License Transition**: Shifted from BSL 1.1 to **Apache 2.0 + Commons Clause**. Added `COMMERCIAL_LICENSE.md` with explicit rebranding and hosting restrictions while preserving a "Free for Builders" model.
- **Consulting Clarity**: Explicitly permitted consulting, integration, and support services within the `LICENSE` file to avoid community friction.
- **Default-On Telemetry**: Metrics are now enabled by default to help developers track ROI (saved tokens, latency, cost) without storing any PII.
- **Enhanced Telemetry Metrics**: Added `retrievalPath`, `finalScore`, `savedByCache`, `sdkVersion`, and `nodeVersion` to event payloads.
- **Telemetry Lifecycle Management**: Added `memory.clearTelemetry()` to explicitly wipe metrics and a **2-year TTL index** on the `_manas_telemetry` collection for automated cleanup.
- **Tier 1 Redis Semantic Cache**: Introduced a production-grade external persistent cache using `ioredis` to complement the existing in-process LRU cache.
- **Hierarchical Tree Reasoning (`TreeIndex`)**: Implemented `reasoningRecall()` method that parses document chunks into a node hierarchy (`document` → `section` → `leaf`) to accurately slice very large contexts.
- **Financial Cost Telemetry (`CostCalculator`)**: Integrated token estimation and USD cost calculations natively into `absorb()` and the `_trace` responses.
- **Universal Polyglot Schema (`SearchFormatter`)**: Normalized all database outputs (Mongo Atlas / pgvector) into a single identical schema contract.

### Changed

- **README Overhaul**: Complete narrative rewrite including a new tagline, story-based intro, and 10-second demo moved to the top for immediate value proof.
- **UI Polish**: Collapsed the Project Structure under a `<details>` tag and repositioned the "Why Use Multiple Databases?" section for better visibility.
- **Roadmap Emoji**: Fixed the broken roadmap header emoji (now 🗺️).
- **Cache-Bypass for Ultra-Short Queries**: Added logic to instantly route queries of 2 words or less directly to databases to prevent TCP cache-fetch overhead.
- **Lazy-Loaded Cache Provider**: Redis (`ioredis`) is now implemented via the `ProviderFactory` lazy-loading architecture.

## [0.3.2] - 2026-03-09

### Added

- **PostgresProvider (`pgvector`)**: Fully functional PostgreSQL driver using `pgvector` allowing 100% feature-parity with MongoDB.
- **Polyglot Broadcasting Mode**: Enable simultaneous insertion and retrieval across both MongoDB and PostgreSQL simultaneously using `databases: [{...}, {...}]`.
- **Lazy-Loading `ProviderFactory`**: Database connection drivers (`pg`, `mongodb`) are now lazy-loaded dynamically ONLY when required, avoiding "missing module" crashes for unutilized databases.
- `verify-lazy-loading.js` script to enforce strict test-cases for package footprint restrictions.

### Changed

- `ManasDB` constructor normalized. All database driver initializations deferred until `memory.init()`.
- Implemented **Strict Mode**: the SDK now fails fast if zero database providers are present when querying `absorb()` or `recall()`.
- Centralized Telemetry (`Telemetry.js`) to support concurrent metrics collection from multi-database deployments.

## [0.3.1] - 2026-03-08

### Fixed

- Rebuilt Bytecode compiler (`bytenode`) logic to resolve broken `node:crypto` imports leading to missing modules in strict ESM bundles (Vite / Next.js).
- Corrected internal table references in PostgreSQL tests causing chunks query SQL failures.
- Addressed UNIQUE constraint BSON ObjectId collision between chunks and vectors in SQL `PostgresProvider`.

## [0.3.0] - 2026-03-05

### Added

- **Context Healing Engine**: Implemented cross-chunk concatenation to recreate parent text without storing monolithic blobs on every DB record.

### Changed

- Shifted chunk contents natively into `_manas_chunks` rather than storing duplicate text within the `_manas_vectors` index.

## [0.2.0] - 2026-02-28

### Added

- **Token-Aware Chunking**: Replacing naive sentence-splitting. Implemented overlapping dynamic context sliding windows.
- **Adaptive Retrieval Routing**: Dynamically scales vector vs sparse weights based on incoming NLP classifications (numeric exact vs deep semantics).
- **Sentinel Micro-Index Mode**: Broad recall matched instantly with per-sentence micro-embeddings.

## [0.1.0] - 2026-02-01

### Added

- Initial Release of the ManasDB core package.
- Intelligent Hybrid Retrieval (RRF + MMR) over MongoDB Atlas Vector Search.
- PII Shield Engine allowing regex sanitization of private data before generation embeddings.
