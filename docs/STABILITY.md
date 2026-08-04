# Stability

## Public API Guarantee

```ts
const memory = new ManasDB(...)
```

Every method reachable from this instance — `init`, `absorb`, `recall`,
`reasoningRecall`, `update`, `delete`, `search`, `batchAbsorb`, `export`,
`import`, `clear`, `migrateTo`, `getTelemetry`, `getStats`,
`clearTelemetry`, `dedup`, `expireOlderThan`, `forgetMany`, `list`,
`close`, plus the `databaseDrivers`/`projectName`/`modelConfig`/`debug`/
`piiShieldConfig` getters and the `cognitive`/`system` namespaces — is
covered by this guarantee: **signatures don't change, methods aren't
removed, and behavior for a given input doesn't change in a
backward-incompatible way**, across any 0.x release.

This is checked mechanically, not just promised: `tests/contracts/api-snapshot.ts`
fails CI if the exact set of public methods/getters changes without the
snapshot being deliberately updated in the same PR, and
`tests/compatibility/compat-tests.ts` fails if a real call through
`ManasDB` produces different output than the equivalent legacy call. See
`docs/architecture/execution_flow.md` for why this is structurally
possible even while the internals underneath are actively changing —
every public method routes through `OperationRouter`, and `ManasDB` itself
never touches the implementation directly.

## Public vs. Internal, at a glance

| | Public (this doc's guarantee applies) | Internal (no guarantee) |
|---|---|---|
| Entry point | `new ManasDB(...)` and everything reachable from it | — |
| Methods | `init`, `absorb`, `recall`, `reasoningRecall`, `update`, `delete`, `search`, `batchAbsorb`, `export`, `import`, `clear`, `migrateTo`, `getTelemetry`, `getStats`, `clearTelemetry`, `dedup`, `expireOlderThan`, `forgetMany`, `list`, `close` | `Runtime`, `RuntimeBuilder`, `Pipeline`/`PipelineEngine`, `Scheduler`/`SchedulerJob`, `ExecutionContext`/`RuntimeContext`, `CapabilityRegistry`/`PluginRegistry`, `EventBus`, `OperationRouter`, `LegacyManasDB`, every storage adapter |
| Namespaces | `memory.cognitive`, `memory.system` (as objects — their individual methods are placeholders today, see `docs/architecture/extension_points.md` #5) | — |
| Getters | `databaseDrivers`, `projectName`, `modelConfig`, `debug`, `piiShieldConfig` | — |
| Error classes | Thrown from a public method (you may `instanceof` catch these) | Error *messages* — never guaranteed word-for-word |
| Extension points | — | `Middleware`, `MemoryRepository`, `CognitiveIntent`, `SchedulerJob` (`src/sdk/plugin-sdk.ts`) — stable *as an interface to implement*, but implementing one doesn't make your implementation part of the public API either |

The right column is the answer to "can I import and use this directly" —
technically yes (nothing stops you), but doing so means accepting it can
be renamed, restructured, or removed in a minor release without that
counting as a breaking change.

## What's NOT covered

Everything under `src/runtime/`, `src/pipeline/`, `src/storage/`,
`src/domain/`, `src/legacy/`, `src/providers/`, `src/errors/` (beyond the
error *classes* thrown from public methods, which are part of the
contract) — none of it is part of the public API, even though most of it
is exported from its own module for internal use across files. Concretely:

- `OperationRouter`, `Runtime`, `RuntimeBuilder`, `Pipeline`,
  `StorageProvider`, any adapter, `LegacyManasDB` — no stability guarantee.
  These can be renamed, restructured, or deleted between minor versions.
- Anything prefixed `__` (e.g. `OperationRouter.__setStrategyForMigration`)
  is explicitly internal-only, by convention, regardless of whether it's
  technically importable.
- Anything documented in `docs/architecture/` is describing the current
  internal shape, not a commitment to keep that shape.
- Error *messages* (as opposed to error *classes* and the fact that
  something throws) are not guaranteed word-for-word — don't match on
  message text; catch the class instead (`ConfigError`, `LifecycleError`,
  `FeatureNotImplementedError`, `StorageNotReadyError`, etc. — all in
  `src/errors/index.ts`).

## Semantic Versioning — what actually changes at each boundary

- **Patch (0.6.x → 0.6.y):** bug fixes, internal refactors, new internal
  architecture (this is where the Runtime/Pipeline/OperationRouter work in
  this repo's history happened) — zero public API change.
- **Minor (0.6 → 0.7):** new public methods/options may be *added*
  (backward compatible), existing ones don't change shape. A previously
  `FeatureNotImplementedError`-throwing method (see
  `docs/architecture/execution_flow.md`, "What 'runtime' actually resolves
  to right now") becoming real is a minor bump, not a major one — the
  signature was already public and stable, only the implementation behind
  it changes.
- **Major (0.x → 1.0, or 1.x → 2.0):** the only version boundary where a
  public method can be removed, renamed, or have its signature or
  documented behavior changed in a way existing code would need to adapt
  to. 1.0 itself is expected to mark the point where the Runtime path has
  fully replaced the legacy path for every operation — a purely internal
  milestone that, per the guarantee above, should not require any
  application code to change.

## If you need to depend on something not covered here

Open an issue rather than importing an internal module directly and
hoping it doesn't move. If there's a real use case for something under
`src/runtime/` or `src/storage/` being stable and public, that's a
conversation about promoting it to the public surface (and documenting it
here), not a reason to treat its current shape as already stable.
