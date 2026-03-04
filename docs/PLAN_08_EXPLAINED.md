# Plan 8: Dimension Mismatch Defense & Canonical Fallback

## The Dimensional Problem

In standard Vector Architectures, embedding arrays are strictly mathematically constrained by dimension count. A local transformer model like `local-minilm` yields a densely mapped 384-dimensional floating-point array.

However, if an enterprise scales up and dynamically hot-swaps the underlying logic to an external provider like `gemini-embedding-001` (768 Dimensions), any attempts to query the legacy 384-D vector index with the new 768-D query vector physically crashes the Matrix algorithms instantly!
In typical environments, this completely breaks production applications until developers manually execute large-scale migration pipelines to recalculate everything.

## The ManasDB "Self-Healing" Solution

ManasDB solves this by dynamically detecting mathematical anomalies at execution time. When it intercepts a MongoDB structural query crash regarding vector schema properties, it natively assumes one of two scenarios:

1. The developer instantiated a new AI connection logic resulting in a dimension mismatch inherently.
2. MongoDB Atlas Vector Search Indexes are still 'Initializing' and literally cannot accept Vector query commands yet.

Instead of crashing the active runtime environment and returning HTTP 500 exceptions dynamically, ManasDB gracefully catches the systemic error structure internally.

### Canonical Fallback Logic

The SDK automatically triggers a private logical execution cycle termed `_canonicalRecall`. This structure physically abandons the mathematical boundaries of LLM arrays completely, routing back onto classical keyword databases.

1. It passes the user's `query` sentence directly back through our security modules, executing `PIIFilter` explicitly guaranteeing that even standard API queries safely wipe structural privacy parameters natively!
2. It pushes the cleaned term through the `MemoryEngine` explicitly isolating the > 4 keyword groupings (e.g. `'where are the access codes'` mathematically yielding `['where', 'access', 'codes']`).
3. It performs a classic `$in` MongoDB query searching all `tags.keywords` physically mapped during `absorb()` loops sequentially!

By doing this, the system structurally survives Model Engine mutations intrinsically rendering output payload metadata properly configured with `{ fallback: true }`, ensuring developers always stay fully aware of their API structures accurately responding seamlessly!
