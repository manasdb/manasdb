# 5. RuntimeBuilder and Runtime Immutability

Date: 2026-08-03

## Status

Accepted

## Context

An early revision of `Runtime` was constructed directly (`new Runtime()`)
and exported as a module-level singleton
(`export const runtime = new Runtime();`). This silently broke
multi-instance usage: two `ManasDB` instances with different configs in
the same process would share one `Runtime`, meaning the second instance's
storage/config could never actually take effect. Separately, a
constructor-ordering bug existed for a time where `ExecutionOrchestrator`
was built from `this.pipeline`/`this.storage` before either field was
assigned, permanently capturing `undefined` for both.

## Decision

`Runtime` is constructed per-`ManasDB`-instance, always via
`RuntimeBuilder`, never directly and never as a shared singleton.
`RuntimeBuilder` is a plain fluent builder (`.withDebug().withStorageProvider().build()`)
that fails fast with a `ConfigError` if no `StorageProvider` was provided,
and every `Runtime` field is `readonly` after construction. Field
assignment order in `Runtime`'s constructor is deliberate — `pipeline` and
`storage` are assigned before `orchestrator`, which captures both as
constructor parameters — with a comment marking why, so the ordering bug
doesn't quietly regress.

## Consequences

- `RuntimeBuilder` has no reason to be kept around after `build()`
  returns, so it's never stored as a field on `ManasDB` — constructed,
  used, and discarded within `ManasDB.init()`.
- `tests/compatibility/test-isolation-ts.ts` exists specifically to prove
  two `ManasDB` instances with different configs (`uri: 'memory://'`,
  different `projectName`s) don't interfere with each other — this is the
  regression test for the exact bug the singleton caused.
- `RuntimeConfig` (the shape both `Runtime` and `RuntimeBuilder` accept)
  lives in its own module, `src/runtime/config.ts` — neither class owns
  it, both just import the type. This broke a real circular import that
  existed when `Runtime` imported `RuntimeConfig` from `builder.ts` while
  `builder.ts` imported `Runtime` from `index.ts`.
