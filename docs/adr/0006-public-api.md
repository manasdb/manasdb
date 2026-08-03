# 6. Public API Stability and Fail-Fast Placeholders

Date: 2026-08-03

## Status

Accepted

## Context

The entire Runtime rewrite (Kernel, DI container, `Runtime`, `Pipeline`,
`OperationRouter`, `StorageProvider`) happened underneath
`new ManasDB(...)` without changing its public method signatures. That
was a deliberate constraint, not an accident, but it created a specific
risk: as new scaffolding was added (storage adapters, new intents,
administrative operations routed through `OperationRouter` for the first
time), several of those new pieces returned plausible-looking empty
results — `[]`, `0`, `null` — instead of doing real work. A caller has no
way to distinguish "genuinely no results" from "this isn't implemented
yet" when the return shape looks identical either way. This happened
concretely: the original `MongoAdapter`/`PostgresAdapter`/`RedisAdapter`
scaffolds returned empty results from every method for a period before
this was caught.

## Decision

Two rules, both non-negotiable for anything reachable from the public
API:

1. **The public API surface itself is frozen** — see `docs/STABILITY.md`
   for exactly what that covers and what it doesn't. Verified mechanically
   by `tests/contracts/api-snapshot.ts` (exact method/property set) and
   `tests/compatibility/compat-tests.ts` (behavioral parity between legacy
   and runtime paths for already-migrated operations).
2. **Anything not implemented yet throws `FeatureNotImplementedError`
   explicitly** rather than returning an empty/zero/null result. This
   applies to `RuntimeEngine`'s administrative methods, every scaffold
   storage adapter's data-plane methods, and the `memory.cognitive.*`
   placeholder stages. Each scaffold adapter additionally self-declares
   `public readonly __placeholder = true as const`, checked by
   `assertStorageReady()` (`src/storage/guard.ts`) before any 'runtime'
   -routed operation is allowed to dispatch against it — a second,
   redundant fail-fast layer in case the first is ever bypassed.

## Consequences

- A caller can always distinguish "this really returned nothing" from
  "this isn't built yet" — the latter always throws, loudly, immediately.
- Bringing a scaffold adapter online requires deliberately removing its
  `__placeholder` marker — not just implementing methods, since the
  marker and the throwing behavior are independent checks.
- New public methods must be added additively (existing signatures don't
  change) — see `docs/STABILITY.md` for what that means at each semver
  boundary.
