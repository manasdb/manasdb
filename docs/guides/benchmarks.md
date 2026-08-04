# Benchmarks

_Moved from README.md to keep the top-level page focused on getting started. See [../README.md](../README.md) for the quick tour._


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

