# Runtime

`Runtime` (`src/runtime/index.ts`) is the Generation 2 orchestrator — the
thing `RuntimeEngine` calls into for every `'runtime'`-strategy operation
(see `execution_flow.md`). This doc covers `Runtime` itself and the pieces
it owns.

## Why Runtime exists

The legacy engine (`LegacyManasDB`) is one class that does everything:
validation, chunking, embedding, storage, telemetry, all inline. That's
fine for a library with one storage backend and one execution path. It
stops being fine once you want a second execution path (the Runtime path
itself), pluggable storage backends, and background jobs — hence
splitting orchestration (`Runtime`), execution (`Pipeline`), and storage
(`StorageProvider`) into separate, independently testable pieces.

## What Runtime owns

Constructed once by `RuntimeBuilder.build()` and immutable after that —
every field is `readonly`:

- **`kernel`** — bootstrapping (`kernel.bootstrap()` runs during `start()`).
- **`pipeline`** — the `PipelineEngine` middleware chain. See `pipeline.md`.
- **`orchestrator`** — `ExecutionOrchestrator`, wraps every operation in a
  `CognitiveTransaction` and dispatches it through the pipeline.
- **`events`** — `EventBus`, wired into `pipeline` by `RuntimeBuilder` so
  middleware can emit events (e.g. `PipelineUnhandled`).
- **`lifecycle`** — `LifecycleManager`. See "Lifecycle" below.
- **`capabilityRegistry`** / **`pluginRegistry`** — plugin/capability
  registration, not yet used by anything in this codebase.
- **`scheduler`** — background job runner. Not yet running any jobs
  (`background-consolidation` is deliberately commented out in `start()`
  until the Runtime CRUD path is fully migrated).
- **`storage`** — a `StorageProvider`, injected via `RuntimeBuilder`, not
  constructed by `Runtime` itself. See `storage.md`.

### A constructor-ordering rule worth knowing

`this.pipeline` and `this.storage` are assigned *before*
`this.orchestrator = new ExecutionOrchestrator(this.pipeline, this.storage)`
in the constructor — deliberately. `ExecutionOrchestrator` captures both as
constructor parameters, so if it were built before either field was
assigned, it would permanently hold `undefined` for both. This was a real
bug in an earlier revision; the comment in the constructor (`"Order
matters..."`) exists so it doesn't regress.

## Builder

`RuntimeBuilder` (`src/runtime/builder.ts`) is the only way to construct a
`Runtime`. It's a plain fluent builder — no reason to keep it around after
`build()` returns, so it's never stored as a field on `ManasDB`:

```ts
const runtime = new RuntimeBuilder()
  .withDebug(debug)
  .withStorageProvider(sharedProvider)   // optional — build() throws without it
  .build();
```

`build()` fails fast with a `ConfigError` if no `StorageProvider` was
provided — better to fail at construction than to construct a `Runtime`
that will fail on its first real operation.

`RuntimeConfig` (the shape both `Runtime` and `RuntimeBuilder` accept) is
defined in its own module, `src/runtime/config.ts` — neither class owns
it, both just import the type.

## Lifecycle

`LifecycleManager` enforces an explicit state machine, not just a stored
"current phase" string:

```
Created → Initializing → Running → Stopping → Stopped
   │            │            │          │
   └────────────┴────────────┴──────────┴──→ Failed
```

Every transition is checked against a `VALID_TRANSITIONS` table before
being applied — `transitionTo()` throws `LifecycleError` for anything not
explicitly allowed (e.g. `Stopped → Initializing`, or skipping straight
from `Created` to `Running`). `Stopped` and `Failed` are terminal — no
transitions out of either. `executeTransaction()` itself checks that the
Runtime is in `Running` phase before dispatching, throwing
`RuntimeNotInitializedError` otherwise.

## What calls into Runtime

Only `RuntimeEngine` (`src/runtime/compatibility/runtime-engine.ts`) —
nothing else should. See `dependency_graph.md` for the enforced direction,
and `execution_flow.md` for the full request path.
