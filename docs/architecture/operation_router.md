# OperationRouter

`src/runtime/compatibility/index.ts` — the single entry point every public
`ManasDB` method routes through. Its own doc comment describes the
intent well: "intentionally tiny... decide which engine handles each
operation. Nothing else."

## Why it's separate from Runtime

`OperationRouter` predates being able to answer "is the Runtime path ready
for this operation yet?" — and it needs to stay answerable to that
question independently of whether `Runtime` exists at all. If routing
logic lived inside `Runtime`, then `Runtime` would need to know about the
legacy engine too, which is exactly the coupling this split avoids.
`OperationRouter` only depends on `OperationEngine` — an interface both
`LegacyEngine` and `RuntimeEngine` implement — never on `Runtime`,
`Pipeline`, or storage directly. See `dependency_graph.md`.

## Why it replaced `CompatibilityRuntime`

An earlier revision called this class `CompatibilityRuntime`. It was
renamed to `OperationRouter` once its job clarified: it isn't really
"compatibility shimming," it's routing — a small but real distinction once
the class started covering every public operation (including the
administrative ones like `clear`/`migrateTo`/`getStats`), not just the
absorb/recall/update/delete/search core. The rename was completed by
updating the two files that still imported the old name
(`src/namespaces/cognitive.ts`, `system.ts`) and deleting the alias export
— there's exactly one name for this class now.

## Per-operation strategy, not a global flag

```ts
export interface PipelineStrategy {
  absorb: 'legacy' | 'runtime';
  recall: 'legacy' | 'runtime';
  update: 'legacy' | 'runtime';
  delete: 'legacy' | 'runtime';
  search: 'legacy' | 'runtime';
}
```

Every operation defaults to `'legacy'`. Only operations with a genuine
dual implementation get a strategy flag at all — the administrative
operations (`exportData`, `clear`, `migrateTo`, `getTelemetry`, `getStats`,
`clearTelemetry`, `dedup`, `expireOlderThan`, `forgetMany`, `list`) still
route through `OperationRouter` (see "one entry point" above), but
unconditionally to `LegacyEngine` — `RuntimeEngine`'s versions of these all
throw "not implemented yet," so a toggle with only one working position
isn't a real migration control.

## Flipping a strategy

`__setStrategyForMigration()` and `__getStrategyForMigration()` exist on
`OperationRouter` for exactly this. Both are explicitly **not part of the
public API** — `ManasDB` never calls or exposes either, by design. They
exist for internal migration tooling and test harnesses
(`tests/test-legacy-routing.ts`) that construct an `OperationRouter`
directly, so each migration milestone can flip exactly the operation it
just finished — verified against `tests/compat-tests.ts` — without editing
this file's source.

See also: `execution_flow.md`, `dependency_graph.md`.
