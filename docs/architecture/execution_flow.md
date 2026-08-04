# Execution Flow

This is the one diagram to read before touching any runtime code. It shows
where a call actually goes today — not where it will go eventually.

## The two live paths

Every public `ManasDB` method (`absorb`, `recall`, `update`, `delete`,
`search`, `batchAbsorb`, plus the administrative operations) goes through
exactly one entry point — `OperationRouter` — which then delegates to one
of two engines depending on a per-operation strategy flag:

```
Application
  │
  │  memory.absorb(text) / memory.recall(query) / ...
  ▼
ManasDB (src/index.ts)              — the public facade, frozen API surface
  │
  ▼
OperationRouter                     — the single entry point (src/runtime/compatibility/index.ts)
  │
  ├── strategy === 'legacy'  ──────► LegacyEngine ──► LegacyManasDB
  │                                                     (src/legacy/LegacyManasDB.ts)
  │                                                     PII Shield → Chunker → Embedding →
  │                                                     Polyglot Broadcast → Mongo/Postgres
  │                                                     (see pipeline.md, "Legacy engine pipeline")
  │
  └── strategy === 'runtime' ──────► RuntimeEngine ──► Runtime.executeTransaction()
                                                          │
                                                          ▼
                                                        Pipeline (middleware chain)
                                                          │
                                                          ▼
                                                        StorageProvider
                                                          │
                                                          ▼
                                                        Adapter (Mongo / Postgres / Redis / Memory)
                                                          │
                                                          ▼
                                                        Database
```

**Today, every operation's strategy defaults to `'legacy'`.** The `'runtime'`
path is fully wired end-to-end (Runtime, Pipeline, StorageProvider, the
storage-middleware that calls into it) but is not reachable through the
public API — flipping a strategy is an internal-only operation
(`OperationRouter.__setStrategyForMigration()`, see `operation_router.md`
in this folder... actually see the doc comment on that method directly in
`src/runtime/compatibility/index.ts`), used by migration tooling and test
harnesses, not by application code. This is deliberate: it lets each
operation migrate independently, verified against the real legacy output,
before it's ever live for a real caller.

## What "runtime" actually resolves to right now

If you flip an operation to `'runtime'` today, be aware of what's
underneath it, because it's easy to assume more is finished than is:

- `RuntimeEngine.absorb/recall/forget` are real — they construct a
  `CognitiveIntent` (`ObserveIntent`/`RecallIntent`/`ForgetIntent`) and
  execute it through `Runtime.executeTransaction()`.
- `RuntimeEngine.update/search/batchAbsorb` and every administrative
  operation (`exportData`, `clear`, `migrateTo`, ...) are stubs that throw
  `"<method>() not implemented in runtime engine yet."` — not silently
  no-ops, but not real either.
- The `StorageProvider` that `Runtime` is built with wraps whatever
  `LegacyManasDB.createStorageProvider()` hands it — today that's the same
  underlying legacy database driver, shared so there's no second
  connection. Before any real `MemoryRepository`-shaped adapter exists,
  calling `absorb`/`recall`/`forget` on the runtime path would fail —
  `assertStorageReady()` (`src/storage/guard.ts`) catches this and throws a
  clear `StorageNotReadyError` rather than letting it fail deep inside a
  pipeline middleware with a confusing "not a function" error.

## Why this shape, specifically

- **One entry point** (`OperationRouter`) means migrating any future
  operation to the Runtime path never requires touching `ManasDB` itself —
  see `operation_router.md`.
- **Per-operation strategy, not a single global flag**, means `absorb` can
  be fully migrated and verified while `recall` is still on the legacy
  path — no big-bang cutover, no operation waits on another.
- **The legacy engine is untouched, byte-for-byte**, from the pre-Runtime
  monolith (`LegacyManasDB` is a straight file move — see
  `docs/adr/` for the original decision). It stays the default until each
  operation's runtime replacement has real storage behind it and has been
  verified against it in `tests/compat-tests.ts` / `tests/test-legacy-routing.ts`.

See also: `architecture_overview.md`, `runtime.md`, `pipeline.md`,
`storage.md`, `dependency_graph.md`.
