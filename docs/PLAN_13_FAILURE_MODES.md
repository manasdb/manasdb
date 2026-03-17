# Plan 13: Failure Modes & Recovery Flow

This document details the architectural behavior of ManasDB when infrastructure components (Databases, Redis, Embedding APIs) experience failures.

## 1. Storage Provider Failures (MongoDB / Postgres)

### 1.1 Total Outage (All Providers Down)
- **Behavior**: `absorb()` and `recall()` will attempt to connect and fail, throwing a `MANAS_DB_ERROR`.
- **Recommendation**: Wrap calls in `try/catch`. ManasDB does not include built-in infinite retries to avoid blocking the event loop or flooding a recovering database.

### 1.2 Partial Polyglot Failure
In Polyglot mode (e.g., Postgres + Mongo), ManasDB implements a **"Best Effort" Broadcast** and a **"Race to Success" Retrieval**.

- **Absorb (Write)**:
    - If Mongo is down but Postgres is up, `absorb()` will succeed. 
    - The failure of the Mongo write is logged to the debug console (if active) and telemetry, but the overall promise resolves. 
    - This ensures high availability for ingestion at the cost of temporary inconsistency.
- **Recall (Read)**:
    - ManasDB executes searches against all providers in parallel (`Promise.any` or concurrent race).
    - If one provider fails or times out, the engine waits for the others.
    - If *at least one* provider returns results, `recall()` succeeds.

---

## 2. Embedding API Failures (OpenAI, Gemini, Ollama)

Embedding generation is a **Hard Dependency** for semantic search.

- **Outage Scenario**: If OpenAI returns a 429 (Rate Limit) or 500 (Down).
- **Behavior**: The `absorb()` or `recall()` call will **Hard Fail** and throw an error. ManasDB cannot "guess" a vector if the API is down.
- **Recovery**:
    - **Retry Logic**: Implement exponential backoff at the application level.
    - **Degradation**: If your application is critical, consider initializing a secondary `ManasDB` instance with a local `transformers` model (which runs on CPU/RAM) as an emergency fallback.

---

## 3. Redis Cache Outage (Tier 1)

Redis is treated as a **Volatile Optimization Layer**, not a source of truth.

- **Behavior**: If your Redis cluster goes offline:
    - The `RedisProvider` will catch the connection error.
    - Subsequent `recall()` calls will **silently bypass** the cache and route 100% of traffic to the backend databases.
    - **No Failures**: Your application will not crash, though you will observe a latency increase as the cache-hit-rate drops to 0.
- **Automatic Recovery**: Once Redis is back online, ManasDB will automatically begin re-warming the cache as new results are fetched from the DB.

---

## 4. Telemetry Failures

- **Behavior**: Telemetry writes are **Fire-and-Forget**. If the telemetry table/collection is inaccessible or full, ManasDB catches the error internally and continues. 
- **Impact**: You may lose metrics for that window, but it will never block user-facing RAG operations.

---

## 5. Summary Table

| Component | Failure Impact | Recovery Path |
|-----------|----------------|---------------|
| **Mongo/Postgres** | Partial Success (Polyglot) | Auto-retry via `config.retry` |
| **All DBs Down** | Hard Failure | App-level `try/catch` & Manual intervention |
| **Embedding API** | Hard Failure | Use local 'transformers' as secondary fallback |
| **Redis Cache** | Latency Increase | Bypassed automatically; Zero downtime |
| **Telemetry** | Loss of Metrics | Self-heals when DB connectivity returns |
| **Budget Cap** | Hard Failure | Increase `monthlyLimit` in constructor |

---

## 6. Monitoring & Alerting

For production deployments, we recommend monitoring the following signals using your observability tool (e.g., Datadog, Prometheus, New Relic):

- **ERROR: `MANASDB_INSERT_FAILURE`**: Occurs when *all* storage providers fail. This requires immediate attention.
- **WARNING: `[ManasDB] Partial insertion failure`**: Indicates one source (e.g., MongoDB) is down while another (Postgres) is healthy. This suggests a degradation that hasn't impacted availability yet.
- **LATENCY: `RECALL_POLYGLOT_COMPLETED`**: Monitor the `durationMs` field in telemetry. If latency spikes without a corresponding increase in `tokens`, check Redis health.
- **QUOTA: `Budget Exceeded`**: Alert when the hard limit is hit, as this indicates ingestion has stopped for that project.
- **MEMORY: `ManasDBWarning` (MemoryProvider)**: If using the `MemoryProvider` in production (not recommended), monitor process warnings for the "MemoryProvider limit reached" message.

---

## 7. Concrete Recovery Patterns

### 7.1 Built-in Retry Configuration
ManasDB v0.4.1+ supports an optional retry configuration for database operations to handle transient network blips.

```javascript
const memory = new ManasDB({
  uri: process.env.MONGODB_URI,
  retry: {
    attempts: 3,   // Total attempts (including the first)
    backoff: 1000  // Delay in MS between retries
  }
});
```

### 7.2 Application-Level Fallback
In highly available systems, consider an "Active-Active" embedding strategy:

```javascript
try {
  await memory.absorb(text);
} catch (err) {
  if (err.message.includes("Ollama error")) {
    console.warn("Primary AI Provider down. Falling back to local offline model...");
    // Switch config dynamically or use a secondary offline-only instance
  }
}
```

---

## 8. Data Consistency & Polyglot Nuances

In Polyglot mode, ManasDB prioritizes **Availability** over **Total Consistency** (CP/AP trade-off).

- **What happens if MongoDB is down during a write?**: Postgres will still be updated. Your search results will return only from Postgres until MongoDB is restored.
- **How does it "Self-Heal"?**: ManasDB does not currently perform an automatic background sync. However, if you re-absorb same content (deduplication logic), or if you use `clearAll()` and rebuild, the providers will naturally converge. 
- **Idempotency**: `absorb()` operations are idempotent for the `MemoryProvider` (via SHA256 hashes), but standard database providers (Mongo/Postgres) will currently append new chunks if called twice with same text, unless you implement a unique constraint on your DB schema manually.
