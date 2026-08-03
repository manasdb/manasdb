# 3. OperationRouter as the Single Entry Point

Date: 2026-08-02

## Status

Accepted

## Context

Early in the Runtime rewrite, a class called `CompatibilityRuntime` handled
routing between the legacy engine and the new Runtime path, but only for
the CRUD core (`absorb`/`recall`/`update`/`delete`/`search`). Every
administrative operation (`clear`, `migrateTo`, `getTelemetry`, `getStats`,
`clearTelemetry`, `dedup`, `expireOlderThan`, `forgetMany`, `list`,
`export`, `import`) was called directly from `ManasDB` against
`LegacyManasDB`, bypassing routing entirely. That meant `ManasDB` had two
different patterns for "call an operation" depending on which operation it
was — and migrating any of the bypassed operations to the Runtime path
later would have meant editing the facade itself, not a routing layer.

## Decision

Rename `CompatibilityRuntime` to `OperationRouter` and extend it to be the
single entry point for *every* public `ManasDB` method, not just the CRUD
core. Administrative operations without a Runtime-path implementation yet
still route through `OperationRouter` — just unconditionally to
`LegacyEngine`, since a `'legacy'`/`'runtime'` toggle with only one working
position isn't a real migration control (see `docs/architecture/operation_router.md`).
`OperationRouter` depends only on the `OperationEngine` interface both
`LegacyEngine` and `RuntimeEngine` implement — never on `Runtime`,
`Pipeline`, or storage by name.

## Consequences

- `ManasDB` never calls `LegacyManasDB` or `Runtime` directly for any
  public operation, without exception.
- Migrating any future operation to the Runtime path is a change confined
  to `OperationRouter` and `RuntimeEngine` — never to `src/index.ts`.
- The rename requires every consumer of the old name to be updated in the
  same change — `src/namespaces/cognitive.ts` and `system.ts` were the two
  that still imported `CompatibilityRuntime` directly; both were updated
  and the alias export removed rather than kept indefinitely.
- `tests/architecture/architecture-ts.ts` checks that `OperationRouter`
  never imports `Runtime` or storage directly, since a router that
  accumulates those dependencies stops being "intentionally tiny."
