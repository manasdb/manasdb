# API Reference

_Moved from README.md — the full method-by-method reference. See [../README.md](../README.md) for the quick tour._


### 💰 Governance & Budgeting

ManasDB is built for enterprises that need to control AI spend. You can set hard monthly caps directly in the constructor.

```javascript
const memory = new ManasDB({
  uri: process.env.MONGODB_URI,
  retry: {
    budget: {
      monthlyLimit: 10.0, // $10.00 USD hard cap
    },
  },
});

// Pre-flight check: "How much will this cost before I embed it?"
const estimate = memory.estimateAbsorbCost("Giant 50 page document...");
console.log(`Estimated Cost: $${estimate.estimatedCostUSD}`);
```

### 🔄 Data Migration

Need to switch from MongoDB to Postgres? Or from OpenAI to a local model? ManasDB handles the heavy lifting.

```javascript
await memory.migrateTo({
  uri: process.env.POSTGRES_URI,
  modelConfig: { source: "openai", model: "text-embedding-3-small" },
});
```

### 🧹 Memory Lifecycle

Keep your database lean with automatic expiration and semantic deduplication.

```javascript
// Remove memories older than 30 days
await memory.expireOlderThan("30d");

// Prune semantic duplicates (threshold 0.95 similarity)
await memory.dedup({ minSimilarity: 0.95 });
```

### `memory.init()`

Initializes database connections and verifies the **Model Dimension Lock**.

- If your existing data was embedded with 1536 dims and you try to init with a 384 dim model, ManasDB will block initialization to prevent corrupted results.

### `memory.absorb(text, options)`

- `text`: String to be remembered.
- `options.metadata`: Optional key-value tags.
- `options.maxTokens`: Chunk size (default 100).
- **Throws**: `Budget Exceeded` error if ingestion would surpass monthly limit.

### `memory.recall(query, options)`

- `options.limit`: Number of results (default 5).
- `options.lambda`: Diversity score (0.0 - 1.0). Default 1.0 (pure relevance).
- `options.mode`: `'qa'` (returns `_trace`) or `'document'` (heals context).
- **Returns**: `_trace` object containing tokens, cost, and retrieval duration.

### `memory.onTrace(callback)`

Subscribe to internal decision logs programmatically.

```javascript
memory.onTrace((trace) => {
  console.log("Retrieval Query:", trace.query);
  console.log("Decision Nodes:", trace.nodes);
});
```

### `memory.forgetMany(query)`

GDPR-compliant erasure. Returns an audit object:

```javascript
{
  deletedTotal: 15,
  timestamp: "2026-03-17...",
  providers: [{ provider: "mongo", deleted: 15 }]
}
```

### `absorb(rawText, options?)`

Ingests and indexes a text document.

```javascript
await memory.absorb(text, {
  metadata: { tag: "value" }, // Attach custom tags for forgetMany querying
  maxTokens: 100, // Max tokens per chunk (default: 100 ≈ 2 sentences)
  overlapTokens: 20, // Token overlap between adjacent chunks (default: 20)
});
// Returns:
// {
//   contentId,
//   vectorId,
//   chunks: number,
//   costAnalysis: { tokens: 142, estimatedCostUSD: 0.00284 }
// }
```

### `recall(query, options?)`

Retrieves semantically matching memories.

```javascript
const results = await memory.recall(query, {
  mode: "qa", // 'document' (chunk recall) | 'qa' (sentence micro-index)
  limit: 5, // Maximum results to return
  minScore: 0.05, // Minimum cosine similarity threshold
  lambda: 0.6, // MMR λ: 1 = pure relevance, 0 = pure diversity
  rrfK: 60, // RRF constant k
  debug: false, // Per-call debug override
});

// Result shape:
// [{
//   contentId,
//   text,           // Full reconstructed document context
//   score,          // Best cosine score from contributing chunks
//   metadata: {
//     matchedChunk,  // The exact sentence/chunk that answered the query
//     sectionTitle,  // Markdown section heading if present
//     allScores,     // All contributing chunks with individual scores
//     healedContext  // true — context was reconstructed from chunks
//   }
// }]
//
// results._trace — pipeline audit log
// { cacheHit: false, rrfMerged: 11, tokens: 9, costUSD: 0.00018 }
```

### `reasoningRecall(query, options?)`

Hierarchical tree-based reasoning recall. Instead of a flat vector search, this maps documents into a `Document → Section → Leaf` hierarchy. It selects the highest-scoring section and returns all its contributing leaf nodes for deep, structured context.

> **Requires:** `new ManasDB({ reasoning: { enabled: true } })` initialized.

```javascript
const result = await memory.reasoningRecall(
  "Summarize the Q3 Financial Goals",
  {
    topSections: 5, // Rank the top 5 document sections
    topSection: 0, // Select the absolute best one (index 0)
  },
);

// Result shape:
// {
//   section: "Q3 Strategy Board Meeting", // The markdown header it grouped by
//   score: 0.9412,                        // Cosine match of the section summary
//   leaves: [
//     { text: "We plan to increase revenue...", chunkIndex: 12 },
//     { text: "By expanding the sales team...", chunkIndex: 13 }
//   ],
//   _trace: { reasoning: true, selectedSection: "hash", cacheHit: 'redis', tokens: 8, costUSD: 0 }
// }
```

### `forget(documentId)`

Alias for `delete(documentId)`. Erases the document and all associated chunks/vectors.

```javascript
await memory.forget("doc_123");
```

### `forgetMany(query)`

Bulk erase documents matching metadata criteria. Returns an audit object.

```javascript
const report = await memory.forgetMany({ userId: "user_99" });
console.log(`Deleted ${report.deletedTotal} docs at ${report.timestamp}`);
```

---

