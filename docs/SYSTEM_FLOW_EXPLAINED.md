# ManasDB System Flow Explained

This document describes the high-level operational execution flow of ManasDB internally. It acts as a clear roadmap mapping exactly how a memory traverses the codebase from initialization to persistence, vector mapping, security filtering, and telemetry. This covers the architecture achieved from Plan 1 through Plan 9.

---

## 1. SDK Initialization & Cluster Connection (Plan 1, 4, & 9)

When a developer sets up ManasDB in their application, three initialization modes are supported:

**Polyglot Mode (both databases):**

```javascript
import { ManasDB } from "@manasdb/core";
const memory = new ManasDB({
  databases: [
    { type: "mongodb", uri: process.env.MONGODB_URI },
    { type: "postgres", uri: process.env.POSTGRES_URI },
  ],
  projectName: "prod_env",
  modelConfig: { source: "openai", model: "text-embedding-3-small" },
  telemetry: true,
  piiShield: true,
});
```

**Single-DB Auto-Discovery (just one database):**

```javascript
const memory = new ManasDB({
  uri: process.env.POSTGRES_URI, // Auto-detected as PostgreSQL from prefix
  projectName: "prod_env",
  modelConfig: { source: "transformers" },
});
```

The SDK inspects the URI prefix at startup (`mongodb://` / `postgres://`) to automatically mount the correct storage provider. Specifying `dbType` is optional as an override.

await memory.init();

1. **Instantiation**: The SDK stores properties internally, preparing the environment.
2. **Database Context via Providers**: Standard connections are initialized under `src/providers`. Both `MongoProvider` and `PostgresProvider` execute their respective `init()` schemas (e.g., verifying `pgvector` or generating MongoDB Indexes dynamically).
3. **Model Binding**: The SDK invokes the `ModelFactory` under `src/core/providers` to map the requested embedding provider (OpenAI, Gemini, Ollama, Transformers).

---

## 2. The Ingestion Pipeline (Absorb)

When a developer stores a sequence natively using `.absorb(text)`:

### A. Context Splitting (Parent-Child) (Plan 2 Revised)

1. **Parent Document**: ManasDB stores the entire input `text` block as a native "Parent" document inside `_manas_content` to preserve raw structure and surrounding contextual boundaries organically.
2. **Child Splitting**: It mathematically splits the overall body into sentences utilizing Regex punctuation bound logic implicitly.
3. **Child Iteration**: Only the _Children_ sentences proceed down the pipeline to map to Vectors, carrying their explicit `parentId` as tracking metadata.

### B. Security Shield (Plan 5)

1. Before any network requests map, if `piiShield` is true, the text passes through `PIIFilter.redact(text)`.
2. Regular expressions replace Emails, Phones, Credit Cards, IPv4s, and API Keys with masked brackets like `[EMAIL]` or `[SECRET]`.
3. The rest of the systemic pipeline only ever operates on this structurally safe redacted string array.

### B. High-Resolution Timing & Hashing

1. **Telemetry Timer**: `process.hrtime.bigint()` natively initializes to track nanosecond precision performance for ROI mapping.
2. **Text Hash Tracking**: `crypto.createHash('sha256')` generates a unique hexadecimal footprint of the text. The engine searches `_manas_content` to see if this string has been seen before globally natively across the project.
3. **Content Persistence**: If new, it inserts it organically into the content collection and yields the relational `content_id`. If it already existed, it merely leverages the existing footprint precisely.

### C. Financial Evaluation & API Deduplication (Plan 6)

1. **Pre-flight Check**: Before ever calling an external model (Cloud APIs costs money), the engine merges the `content_id` and the generic model name mathematically into an `embedding_hash`.
2. **Cache Discovery**: It searches `_manas_vectors` for this hash constraints natively.
3. **Deduplication Matrix**:
   - **If Found**: It intercepts execution. It avoids the Model provider entirely. Cost naturally triggers `$0.00`. It registers `isDeduplicated = true` to accurately calculate savings structurally.
   - **If NOT Found**: It instructs the `ModelFactory` to request a dense Float32 array from OpenAI, Gemini, Ollama, or Transformers natively blocking pipeline till execution completes!

### D. Relational Vector Insert (Broadcast)

If vectors were mapped via LLMs natively, the orchestrator invokes a generic `Promise.all()` over all configured Database Providers. The exact array inserts structurally inside `_manas_vectors` concurrently across both MongoDB and PostgreSQL, carrying their respective project mapping reference boundaries explicitly.

---

## 3. The Retrieval Pipeline (Recall) (Plan 3 & 9)

When requesting a semantic search using `.recall(query)`:

1. **Security & Hashing**: The search term is optionally redacted. A fresh timer initializes.
2. **Cloud Transformation**: The query string is passed identically back through the `ModelFactory` to transform the phrase into an identically scaled Float32 vector array explicitly structurally mapping the dimension sizes inherently (handling dynamic Matryoshka dimensionality seamlessly if required).
3. **Polyglot Provider Sweep**: The raw array payload is piped concurrently into all registered Database Providers.
   - **MongoDB Atlas (`$vectorSearch`)**: Indexes vectors mapping via `cosine` proximity.
   - **PostgreSQL (`pgvector`)**: Evaluates similarities natively utilizing the distance (`<=>`) operator in a `JOIN`.
4. **Relational Context Healing**: Depending on the connected DB, the backend Provider engine executes a relational reverse-linking stage (`$lookup` arrays in Mongo, and standard `JOIN`s mapped efficiently natively via `id` parameters in Postgres), grabbing the full Paragraph context text cleanly!
5. **Score Serialization**: The system extracts the top vectors, merges them inside the SDK engine, strips away custom DB attributes, formats to normalized JSON, and executes Reciprocal Rank Fusion on standard `< 1.0` scores globally.
6. **Formatted Output**: The system organically unwinds the lookup properties yielding beautifully clean object responses representing actual text properties, exact search proximity scores, and metadata dynamically safely (including `healedContext: true` tracking indicators actively).

---

## 4. Abstracting Business Intelligence (Plan 6 & Plan 7)

### A. Silent Telemetry Logs (Plan 6)

At the climax of `.absorb()` or `.recall()`, the underlying high-resolution timer organically finalizes.

- A **"Fire and Forget"** Polyglot broadcast attempts pushing payloads into `_manas_telemetry` concurrently across all active database connections without ever running `await` natively.
- This ensures 0 milliseconds of execution time is added to the user request.
- It calculates `actual_cost` mapping structural pricing arrays (e.g., $0.02 / 1M tokens) globally correctly quantifying financial metrics structurally inherently isolated mathematically safely!

### B. Command Line Output Mapping (Plan 7)

Because standard logging mechanisms organically exist securely, we map the external CLI structure `bin/manas.js` identically.

- Developers execute `npx manas stats` exactly cleanly generating dynamic pipeline outputs.
- The Engine aggregates the internal `_manas_telemetry` calculations projecting literal Token usage metrics, Total Dollar values dynamically intercepted / saved, and precise execution bypass milliseconds!
- `npx manas health` executes basic logical API connectivity loops validating DB infrastructure directly automatically explicitly!
