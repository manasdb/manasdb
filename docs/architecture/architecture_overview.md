# Architecture Overview

Read this first if you're new to the codebase. For the request-by-request
picture, see `execution_flow.md` — this doc is the map of the pieces
themselves.

## The two generations living side by side

ManasDB is mid-migration from a single monolithic class to a layered
runtime. Both exist in the codebase today, on purpose:

| | Generation 1 — "Legacy" | Generation 2 — "Runtime" |
|---|---|---|
| Entry class | `LegacyManasDB` (`src/legacy/`) | `Runtime` (`src/runtime/`) |
| Status | Fully working, currently the default for every operation | Fully wired, not yet the default for anything |
| Storage | Direct calls into `src/providers/{mongodb,postgres,redis,memory}.ts` | `StorageProvider` → adapter (`src/storage/adapters/`), still scaffolds |
| Why it still exists | It's the only thing that actually persists data today | It's what every operation migrates *to*, one at a time |

Neither is "the old one to delete" yet. `LegacyManasDB` is a straight,
unmodified copy of the original pre-Runtime class — see the ADRs in
`docs/adr/` for why it was moved rather than rewritten.

## The pieces, top to bottom

- **`ManasDB`** (`src/index.ts`) — the public facade. Its method
  signatures are the one thing that must never change. It owns a
  `LegacyManasDB` instance and a `Runtime` instance, and never calls either
  directly — everything goes through `OperationRouter`.
- **`OperationRouter`** (`src/runtime/compatibility/index.ts`) — the single
  entry point for every public operation. Reads a per-operation strategy
  (`'legacy'` or `'runtime'`) and delegates. See `operation_router.md`.
- **`LegacyEngine`** / **`RuntimeEngine`** — thin adapters that make
  `LegacyManasDB` and `Runtime` both satisfy the same `OperationEngine`
  interface, so `OperationRouter` never needs to know which one it's
  calling.
- **`Runtime`** (`src/runtime/index.ts`) — the Generation 2 orchestrator.
  Owns a `Kernel`, `PipelineEngine`, `EventBus`, `LifecycleManager`,
  `Scheduler`, and a `StorageProvider`. Immutable after construction —
  assembled once by `RuntimeBuilder`. See `runtime.md`.
- **`Pipeline`** (`src/pipeline/`) — the middleware chain a `CognitiveIntent`
  executes through on the Runtime path. See `pipeline.md`.
- **`StorageProvider` / adapters** (`src/storage/`) — the Generation 2
  storage abstraction (`MemoryRepository` interface) and its four adapters
  (Mongo/Postgres/Redis/Memory), currently all scaffolds. See `storage.md`.
- **`CognitiveAPI` / `SystemAPI`** (`src/namespaces/`) — the `memory.cognitive.*`
  and `memory.system.*` namespaces. Both route through `OperationRouter`
  too; most of their methods are still placeholders returning a fixed
  shape (`CognitiveStageResult`, etc.) rather than doing anything yet.

## Where to go next

- Making a request end-to-end? Read `execution_flow.md`.
- Adding a new storage backend? Read `storage.md` and `extension_points.md`.
- Confused about which file can import which? Read `dependency_graph.md`.
- Migrating an operation from legacy to runtime? Read `operation_router.md`
  and the doc comments on `OperationRouter.__setStrategyForMigration()`.
- Building any extension point (adapter, middleware, intent, scheduler
  job)? Import from `src/sdk/plugin-sdk.ts` — one barrel for all four,
  cross-referenced from `extension_points.md`.
