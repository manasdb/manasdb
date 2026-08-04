# Extension Points

New functionality should extend one of the points below before introducing
new architecture. If what you're building doesn't fit any of these, that's
worth a conversation (and probably an ADR in `docs/adr/`) before writing
code, not after.

All four class/interface-based extension points below (everything except
#5, which doesn't have a base type yet) are re-exported from one place:
**`src/sdk/plugin-sdk.ts`** — import from there rather than reaching into
`src/runtime/`, `src/pipeline/`, or `src/domain/` directly. It's a barrel,
not a redefinition — each type's real logic still lives where it's
documented below. `tests/contracts/plugin-sdk-contract.ts` builds one
minimal, real instance of each and runs it, so this isn't just an
aspirational list — it's checked.

## 1. A new storage adapter

Implement `MemoryRepository` (re-exported from `src/sdk/plugin-sdk.ts`,
defined in `src/domain/repositories/MemoryRepository.ts`) in
`src/storage/adapters/`. Do **not** set
`public readonly __placeholder = true`. Every method must do something
real — if a method genuinely can't be implemented yet, throw
`FeatureNotImplementedError` from it explicitly rather than returning a
plausible-looking empty result (see `storage.md` for why: a stub that
returns `[]` is indistinguishable from a real "no matches found," and
that's exactly the failure mode this convention exists to prevent).

## 2. A new middleware stage

Implement the `Middleware` interface (re-exported from
`src/sdk/plugin-sdk.ts`) and register it with `runtime.pipeline.use(...)`
in `Runtime.start()`. Middleware runs in onion order — call `next()` to
continue the chain. See `pipeline.md` for the current, honest state of
what's registered today.

## 3. A new intent

Extend `CognitiveIntent` (re-exported from `src/sdk/plugin-sdk.ts`,
defined alongside `ObserveIntent`/`RecallIntent`/`ForgetIntent` in
`src/runtime/execution/intent.ts`), executing via
`context.pipeline.execute(...)` — never touching storage directly (see
`dependency_graph.md`). Then give `RuntimeEngine` a method that constructs
it and dispatches through `Runtime.executeTransaction()`, and add the
matching method to `OperationEngine` so both engines (and `OperationRouter`)
stay in sync.

## 4. A new scheduler job

Extend `SchedulerJob` (re-exported from `src/sdk/plugin-sdk.ts`, defined
in `src/runtime/scheduler/index.ts`) and call `.registerOn(runtime.scheduler)`
inside `Runtime.start()`:

```ts
class ConsolidationJob extends SchedulerJob {
  readonly name = 'background-consolidation';
  readonly options = { intervalMs: 60_000 };
  async run(context) { /* ... */ }
}
new ConsolidationJob().registerOn(runtime.scheduler);
```

This is a thin class-based wrapper over the older
`scheduler.register(name, options, handler)` call — both work, prefer the
class form for anything contributed as a plugin. Nothing is registered
today — `background-consolidation` is explicitly commented out until the
Runtime CRUD path finishes migrating. This is the intended home for future
cognitive-layer work (consolidation, reflection) once that begins.

## 5. A new cognitive module

`memory.cognitive.*` (`src/namespaces/cognitive.ts`) is the intended public
surface for this — `reflect`/`learn`/`consolidate`/`reconcile` currently
return a fixed placeholder shape (`CognitiveStageResult`) with no real
logic. Wiring one of these to a real `Intent` follows the same shape as
extension point 3. Unlike the other four, this doesn't have its own base
class in `src/sdk/plugin-sdk.ts` yet — it's built directly on extension
point 3, not a separate mechanism.

## What NOT to do

Don't add a new top-level orchestration class, a second `Pipeline`
implementation, or a second router. If a request doesn't fit through
`OperationRouter → LegacyEngine/RuntimeEngine`, that's a sign the request
needs a new intent or middleware (extension points 2–3), not a parallel
path around the router.
