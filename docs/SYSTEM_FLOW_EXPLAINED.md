# ManasDB System Flow Explained

This document describes the high-level operational execution flow of ManasDB internally. It acts as a clear roadmap mapping exactly how a memory traverses the codebase from initialization to persistence, vector mapping, security filtering, and telemetry. This covers the architecture achieved from Plan 1 through Plan 7.

---

## 1. SDK Initialization & Cluster Connection (Plan 1 & Plan 4)

When a developer sets up ManasDB in their application:

```javascript
import { ManasDB } from "@manasdb/core";
const memory = new ManasDB({
  uri: process.env.MONGODB_URI,
  dbName: "my_project",
  projectName: "prod_env",
  modelConfig: { source: "openai", model: "text-embedding-3-small" },
  telemetry: true,
  piiShield: true,
});
await memory.init();
```

1. **Instantiation**: The SDK stores properties internally, preparing the environment.
2. **Database Context**: `MongoConnection.connect()` safely pulls down the `MongoClient` as a Singleton. It also constructs necessary generic Vector indexes dynamically based on the requested model resolution dimensions if they don't exist yet (e.g., `vector_index_512`).
3. **Model Binding**: The SDK invokes the `ModelFactory` to map the requested provider (OpenAI, Gemini, Ollama, Transformers).

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

### D. Relational Vector Insert

If vectors were mapped via LLMs natively, the exact array inserts structurally inside `_manas_vectors` inherently carrying the `content_id` parameter reference mapping explicitly safely mapped.

---

## 3. The Retrieval Pipeline (Recall) (Plan 3)

When requesting a semantic search using `.recall(query)`:

1. **Security & Hashing**: The search term is optionally redacted. A fresh timer initializes.
2. **Cloud Transformation**: The query string is passed identically back through the `ModelFactory` to transform the phrase into an identically scaled Float32 vector array explicitly structurally mapping the dimension sizes inherently (handling dynamic Matryoshka dimensionality seamlessly if required).
3. **Atlas `$vectorSearch`**: The raw array payload is piped into MongoDB Atlas leveraging its physical vector indexing structure natively sorting by `cosine` proximity targeting child sentence vectors specifically!
   - **Self-Healing Fallback (Plan 8)**: If the `$vectorSearch` triggers a dimensional crash (e.g., trying to evaluate a 768-D query against a 384-D vector database collection) or encounters an initializing index, ManasDB silently traps the exception natively! It aborts the mathematics and triggers `_canonicalRecall()`. This routes the query terms directly against traditional `tags.keywords` structures populated previously!
4. **Relational Joining**: Leveraging native `$lookup` stages internally, the fast vector references map natively instantly joining against their source bodies housed inside `_manas_content`.
5. **Context Healing (Plan 2 Revised)**: The system extracts the unique `parentId` keys from all matched standalone sentences. It performs a secondary native query extracting the complete semantic Parent Document payloads natively, returning the entire paragraph block instead of simply an isolated sentence!
6. **Formatted Output**: The system organically unwinds the lookup properties yielding beautifully clean object responses representing actual text properties, exact search proximity scores, and metadata dynamically safely (including `healedContext: true` tracking indicators actively).

---

## 4. Abstracting Business Intelligence (Plan 6 & Plan 7)

### A. Silent Telemetry Logs (Plan 6)

At the climax of `.absorb()` or `.recall()`, the underlying high-resolution timer organically finalizes.

- A **"Fire and Forget"** MongoDB array write attempts pushing payloads into `_manas_telemetry` dynamically without ever running `await` natively.
- This ensures 0 milliseconds of execution time is added to the user request.
- It calculates `actual_cost` mapping structural pricing arrays (e.g., $0.02 / 1M tokens) globally correctly quantifying financial metrics structurally inherently isolated mathematically safely!

### B. Command Line Output Mapping (Plan 7)

Because standard logging mechanisms organically exist securely, we map the external CLI structure `bin/manas.js` identically.

- Developers execute `npx manas stats` exactly cleanly generating dynamic pipeline outputs.
- The Engine aggregates the internal `_manas_telemetry` calculations projecting literal Token usage metrics, Total Dollar values dynamically intercepted / saved, and precise execution bypass milliseconds!
- `npx manas health` executes basic logical API connectivity loops validating DB infrastructure directly automatically explicitly!
