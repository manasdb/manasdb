# Dependency Graph

The allowed direction of imports, top to bottom. An arrow means "may
import from," and nothing may import upward.

```
ManasDB (src/index.ts)
  │
  ▼
OperationRouter ──► LegacyEngine ──► LegacyManasDB
  │                                     │
  ▼                                     ▼
RuntimeEngine ──► Runtime            src/providers/* (Mongo/Postgres/Redis/Memory)
  │
  ▼
Pipeline (Middleware chain)
  │
  ▼
StorageProvider
  │
  ▼
Adapter (src/storage/adapters/*)
```

## Rules this repo tries to hold itself to

- **`Runtime` never imports a concrete adapter.** It only knows about
  `StorageProvider`, which is handed to it fully assembled by
  `RuntimeBuilder`. `Runtime` constructing `new MongoAdapter()` itself
  would mean it can never run against anything else — the whole point of
  `StorageProvider` is that `Runtime` doesn't know or care which database
  is underneath it.
- **`CognitiveIntent`s never touch storage directly.** `ObserveIntent`,
  `RecallIntent`, etc. (`src/runtime/execution/intent.ts`) call
  `context.pipeline.execute(...)` — never `context.storage` directly. Only
  the storage *middleware* (`src/pipeline/storage-middleware.ts`) touches
  `StorageProvider`. This keeps "what an intent means" separate from "how
  it's persisted."
- **`OperationRouter` has no storage dependency at all.** It only knows
  about `OperationEngine` (the interface both `LegacyEngine` and
  `RuntimeEngine` implement) — never `Runtime`, `Pipeline`, or
  `StorageProvider` by name. This is what makes it safe for `OperationRouter`
  to be "intentionally tiny" (its own doc comment's words) — it has
  nothing to get wrong about the internals of either engine.
- **`ManasDB` never calls `LegacyManasDB` or `Runtime` directly** for any
  public operation — always through `OperationRouter`. See
  `operation_router.md`.

## `tests/architecture-ts.ts` checks some of this automatically

A handful of these rules are enforced by a lightweight string-search test
(not a true AST-based dependency linter, but functional): it fails if
`src/runtime/execution/intent.ts` imports a concrete adapter, or if
`src/runtime/index.ts` imports one, or if the old module-level `Runtime`
singleton reappears. Extending this test as new rules get added here is
cheaper than relying on code review to catch a violation.
