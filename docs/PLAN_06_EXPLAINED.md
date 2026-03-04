# Plan 6: ROI, Token & Financial Telemetry

This document outlines the architecture and financial logic behind the **Silent Telemetry & Metrics Collector** inside ManasDB. This telemetry system not only monitors system latencies and health but also tracks precise financial ROI, proving exactly how much money the SDK saves organizations by intercepting redundant API compute payloads.

## 1. Non-Blocking Telemetry (Fire and Forget)

In highly synchronous SDK models, whenever data gets passed into metrics arrays (`mixpanel`, `datadog` or even pure `MongoDB log inserts`), there's a risk of the API endpoint stalling the user's primary execution threads natively.

We deployed an explicit **"Fire and Forget"** architectural configuration mapped entirely around native JavaScript Promise delegation:

```js
// The native insert inside our internal system intentionally orphans the promise chain
telemetryCollection.insertOne(telemetryDoc).catch(() => {});
```

This forces the Node.js event pool to dispatch the database command without forcing the main `.absorb()` or `.recall()` execution pipelines to `await` confirmation. This guarantees **0 milliseconds** of forced latency penalties against user queries.

Additionally, the entire `.logEvent()` payload physically maps into identical strict `try/catch` handlers catching explicit edge-cases seamlessly and silently (such as network drops).

## 2. High-Resolution Performance Timers

Standard `Date.now()` logic evaluates system clock structures notoriously resulting in highly imprecise durations. ManasDB maps standard V8 `process.hrtime.bigint()` hooks natively, granting mathematically robust nanosecond mappings to exactly evaluate execution load:

```js
const diffNs = process.hrtime.bigint() - startTime;
const durationMs = Number(diffNs) / 1000000.0;
```

This precision allows ManasDB to literally prove that cached memory responses return in microseconds natively.

## 3. Autonomous Financial Telemetry (ROI Validation)

Beyond abstract software metrics, ManasDB executes token estimators (`CostCalculator.js`) specifically to estimate real-world costs evaluating inputs against typical model pricing (OpenAI `text-embedding-3-small` / Gemini averages / Local Transformers).

### Estimating Tokens & Cost

We use a lightweight, ultra-fast approximation (roughly `text.length / 4`) instead of pulling in heavy byte-pair encoding libraries like `tiktoken`. This ensures the semantic cache evaluation is instantaneous.

The formula for financial computation is:

```js
let pricePer1M = 0.02; // Average cost based on OpenAI's text-embedding-3-small
let cost = (tokens / 1000000) * pricePer1M;
```

### Deduplication Savings & Local-First ROI

A key business proposition of a Semantic Relational Store is **Vector Hash Deduplication**. When a user sends an exact sentence that already exists natively mapped identically under the same project bounds:

1. ManasDB evaluates its cryptographic `content_hash`.
2. It discovers the previously mapped `content_id`.
3. The SDK **physically skips** executing the AI Model API mapping layer entirely!
4. It logs exactly how many `tokens` were spared and sets `actual_cost: 0`. It calculates the `savings_financial` (in USD) equating to literal cost savings on your billing statement.

When using **Local First** adapters like `Transformers.js` or `Ollama`, ManasDB skips both standard cloud costs and network latency. The telemetry correctly logs the system speedup bounds natively, letting developers visually construct "ROI Reports" that show `100% savings` over traditional cloud architecture configurations.

## 4. Telemetry Events Logged

Currently, ManasDB seamlessly collects metrics without storing text sequences:

- **`ABSORB_COMPLETED`**: Logged whenever data is explicitly digested through the model pipelines (meaning an API hit likely occurred). Tracks tokens used and costs mapped.
- **`DEDUPLICATED`**: Logged when the hashing engine mathematically proves the data already exists. Real-world API cost drops to 0 and `savings_financial` logs the recovered budget!
- **`ABSORB_ERROR`**: Tracked natively generating failed structural parameter bounds without text outputs.
- **`RECALL_VECTOR_MATCH`**: Measures the full `$vectorSearch` pipeline latency. Always incurs cost (as search vectors must be embedded).
- **`RECALL_DIM_MISMATCH_ERROR`**: Tracks dimension mismatches effectively.

## 5. Privacy and Opt-Out

ManasDB explicitly completely blanks identifying content! The telemetry schemas bypass literal text arrays, fully isolating PII boundaries completely inherently.

If requested, execution engines can explicitly completely disable all native hooks directly against logic loops initialization:

```js
import ManasDB from "manasdb";
const memory = new ManasDB({
  uri: "mongodb+srv://...",
  telemetry: false, // Disables all financial and latency metrics globally
});
```
