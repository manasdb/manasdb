# 🏢 Enterprise Readiness: Scaling ManasDB

This document provides a detailed breakdown of how ManasDB handles extreme scale, structural stability, data privacy, concurrency, and memory consumption.

---

## 1. How does ManasDB behave at 10M+ vectors?

**It categorizes, compresses, and scales efficiently.**

1. **Search at Scale:** ManasDB leverages MongoDB Atlas `$vectorSearch` natively. This leverages `HNSW` (Hierarchical Navigable Small World) graphs, meaning nearest-neighbor searches operate extremely fast, even against tens of millions of vectors.
2. **Reduced Footprint:** ManasDB quantizes its ANN storage vectors (`vector`) to `int8` or `float16` by default. This halves BSON sizes resulting in significantly cheaper RAM usage on Atlas clusters.
3. **O(1) Operations:** Core pipeline stages heavily utilize compound indexes. When `absorb()` executes, it checks `{ embedding_hash: 1 }`. When `recall()` rebuilds text through **Context Healing**, it uses the `{ document_id: 1, chunk_index: 1 }` index. At 10M vectors, these steps run securely in `O(1)` or `O(log n)` time without bottlenecking node traversal.

---

## 2. How stable is Index Management?

**Automatic creation, duplicate-protection, and prunable execution.**

1. **Safe Initialization:** The primary `init()` method uses `listSearchIndexes()` and safe `try/catch` handlers to establish Atlas search indexes, chunk semantic indexes, and document metadata structures. **No duplicate index creation errors.**
2. **Dimension Polling:** An edge-case arises if a team transitions from a local provider (`transformers`, 384 dims) to a commercial cloud API (`openai`, 1536 dims). ManasDB cleanly detects the new dimensionality and gracefully triggers a new index.
3. **Safety Fallback:** While doing this, `npx manas health` reports if you have accumulated `> 2` unreferenced Atlas dimension indexes (which consume memory) and provides the CLI utility `npx manas index-prune` to clear those orphaned structures.

---

## 3. Does Telemetry Leak User Data?

**No. Structurally impossible.**

1. **Numeric Logs Only:** The `_manas_telemetry` collection intercepts events from `absorb` and `recall`. Every entry conforms explicitly to numeric metrics: execution `durationMs`, `actual_cost` tokens, `potential_cost`, and boolean latency flags.
2. **Zero PII Exposure:** Queries, document bodies, text chunks, API keys, and match results are completely unmapped inside the scope of the `logEvent()` invocation.
3. **100% Local Scope:** Most importantly, ManasDB does not send metadata to developers, external endpoints, or public services. It runs directly as a singleton and writes to your internal MongoDB instance. Disable it completely via `telemetry: false` during instantiation.

---

## 4. How well does it handle concurrent `recall` and `absorb`?

**It is explicitly Thread-Safe for reads and Write-Locked for concurrent injection.**

1. **Read Paths (`recall`):** The engine operates completely statelessly. All structures representing context `vecMap`, heuristic RRF maps, MMR buckets, and operational `traceLog` are ephemeral and strictly initialized within the function scope. Scalability hits a glass ceiling purely bounded by your MongoDB Connection Pool.
2. **Write Paths (`absorb`):** When thousands of documents pipe into the ingest stream via webhooks, paragraphs overlap. A naive engine would duplicate arrays. ManasDB harnesses MongoDB Document Locking. Using the atomic pipeline `findOneAndUpdate({ $setOnInsert: ... }, { upsert: true })`, if ten requests drop identically matching paragraphs, only the primary request yields the computation; the other 9 requests seamlessly return the matched `vector_id` without wasting a single token.
3. **LRU Cache Hit Engine:** Concurrent pipeline runs attempt overlapping map insertions to `semanticCacheIndex`. Using JS `Map` validation (`if(!semanticCacheIndex.has(hash))`), synchronous overlapping reads map flawlessly without causing Array drift.

---

## 5. Is Memory Usage strictly Bounded?

**Yes — hard memory ceilings resolve unbound heap crashes.**

1. **Reranking Ceiling:** If an overarching application passes `{ limit: 5000 }` dynamically, the Engine safeguards V8 Heap bloat by enforcing `const MAX_FETCH = 200`. The driver restricts loading unbounded unquantized `vector_full` arrays (1.2MB limit total per query).
2. **Context Healing Guardrail:** While generating document representations out of isolated vectors (`Context Healing`), ManasDB limits chunk merges. The internal `.limit(100)` clause per `document_id` ensures processing a 30,000-page book doesn’t overrun Node.js stack memory via array concatenation.
3. **Sentence Batches:** Building Sentinel Micro-Indexes triggers chunk extraction logic. Because these operate in synchronous arrays, ManasDB processes sentence embeddings through `Promise.all` in explicit arrays of `BATCH_SIZE = 20`. Older batches are dropped straight into the Garbage Collector seamlessly.
