# Pipeline

There are two different things called a "pipeline" in this codebase,
depending on which engine (`legacy` or `runtime`) is handling the
operation — see `execution_flow.md` for how that's decided. Don't confuse
them; they're unrelated code paths that happen to share a name.

## 1. The legacy engine's internal pipeline (what runs today, by default)

This is `LegacyManasDB`'s own internal sequence — not a `Middleware` chain,
just the literal order of operations inside `absorb()`/`recall()`. This is
what every operation actually runs through right now, since every
`PipelineStrategy` flag defaults to `'legacy'`.

```
ABSORB
Raw Text
  ├─ PII Shield (optional redaction)
  ├─ Token-Aware Chunker
  │     ├─ Section-boundary detection (### headers / double-newlines)
  │     ├─ Dynamic token-budget sliding window (default 100 tokens)
  │     └─ Overlap buffer (default 20 tokens)
  ├─ Chunk Embedding + Deduplication (content-hash SHA256)
  ├─ Sentence Micro-Index (per-chunk sentence vectors)
  ├─ Provider Broadcast (concurrent inserts across every configured DB)
  └─ Telemetry Broadcast → _manas_telemetry

RECALL
Query String
  ├─ Tier 1 (Redis) / Tier 2 (in-memory LRU) semantic cache short-circuit
  ├─ Adaptive mode detection (short factual / numeric / long conceptual)
  ├─ Multi-database vector search (Mongo $vectorSearch / Postgres pgvector)
  ├─ Reciprocal Rank Fusion + MMR reranking (recall()), or
  │  Hierarchical tree search (reasoningRecall())
  ├─ Exact cosine rerank + context healing
  └─ PII Shield on output
```

This logic lives directly in `src/legacy/LegacyManasDB.ts` — it's a
straight copy of the pre-Runtime monolith, unmodified. See `docs/adr/` for
why it wasn't rewritten in place.

## 2. The new middleware Pipeline (`src/pipeline/`)

This is a genuine `Middleware`-chain engine — `PipelineEngine.use(middleware)`
registers a middleware, and `.execute(context)` runs them in onion order
(each middleware calls `next()` to continue the chain). It exists and is
wired into `Runtime.start()`, but **only one middleware is registered
today**: `createStorageMiddleware()` (`src/pipeline/storage-middleware.ts`).

Be aware, if you're extending this, that the current storage middleware is
a single `if/else` on `context.params.intent` (`'absorb'` / `'recall'` /
`'hybridRecall'` / `'forget'`), not yet a set of composable stages. The
aspirational chain — `Validation → Telemetry → PII Shield → Chunking →
Embedding → Storage → Events` — described in early planning docs is a
future-state design, not what's implemented. Treat this file's current
form as "the socket exists, only one thing is plugged into it yet."

One known issue in this file worth knowing about before you build on it:
`storage-middleware.ts` imports a type named `PipelineMiddleware` from
`./index.ts`, but the actual exported type there is `Middleware` — this is
a pre-existing `tsc` error (not introduced by any change described in this
doc set) that doesn't block `npm run build` because the build step
(`esbuild`) doesn't type-check. Fixing the import name is a one-line fix;
it's called out here so it isn't mistaken for intentional.

### Why a middleware chain at all, if only one thing is registered

Because the point isn't today's single middleware — it's that adding the
next stage (PII redaction, budget checks, telemetry, event emission) means
writing one new `Middleware` and calling `pipeline.use()` in
`Runtime.start()`, not editing `RuntimeEngine` or any `CognitiveIntent`.
See `extension_points.md`.

See also: `architecture_overview.md`, `execution_flow.md`, `storage.md`.
