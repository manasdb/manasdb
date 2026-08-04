# 8. Capability Discovery

Date: 2026-08-04

## Status

Proposed — not implemented. This ADR exists to record the design so it
doesn't get re-derived from scratch each time it comes up, not to
authorize building it now. See `docs/governance/ROADMAP.md`, "Not on the
roadmap yet, but proposed."

## Context

Deciding what a storage backend can do currently means checking which
concrete type it is (`provider.type === "mongodb"`, or similar), which
means `Runtime`/`Pipeline` code has to know about every backend
individually rather than asking "can you do X." As more adapters are
added (see `docs/architecture/storage.md`), this either means an
ever-growing set of type checks scattered through call sites, or a
capability-based check: `provider.supports("HybridSearch")`.

Partial groundwork for this already exists, unused: `Runtime` constructs a
`CapabilityRegistry` (`register()` / `hasCapability(moduleName, capability)`
/ `getModulesWithCapability(capability)`), `ModuleManifest` already has a
`capabilities: string[]` field, and `MongoAdapter` already exports a
manifest listing `['vector-search', 'metadata-filter', 'ttl']`. None of it
is wired to anything — `register()` is only ever called from
`PluginRegistry.loadPlugin()`, which nothing calls.

Two problems with adopting that existing scaffolding as-is:

1. **It's name-keyed, not instance-keyed.** `hasCapability('mongodb-adapter', 'vector-search')`
   requires already knowing which module you're asking about — it can't
   answer "what can *this* `StorageProvider` I'm holding do" without a
   separate name lookup first. `provider.supports("HybridSearch")` wants
   to ask the object directly.
2. **Capability names are untyped strings** (`'vector-search'`, lowercase-
   kebab, vs. the proposed `"HybridSearch"`, PascalCase) — a typo
   (`'HybridSarch'`) would silently and permanently return `false` rather
   than fail to compile.

## Decision (proposed)

- Define capabilities as a typed union, not bare strings:
  ```ts
  export type Capability =
    | 'VectorSearch'
    | 'HybridSearch'
    | 'Transactions'
    | 'MetadataFilters'
    | 'Streaming'
    | 'GraphTraversal'
    | 'TTL';
  ```
- Add `supports(capability: Capability): boolean` directly to
  `MemoryRepository` (`src/domain/repositories/MemoryRepository.ts`), so
  every adapter answers for itself — instance-keyed, no name lookup:
  ```ts
  interface MemoryRepository {
    // ...existing methods
    supports(capability: Capability): boolean;
  }
  ```
- `StorageProvider` delegates `supports()` to its wrapped adapter, same
  pattern as every other `MemoryRepository` method it already forwards.
- Retire the existing name-keyed `CapabilityRegistry`/`PluginRegistry`
  rather than running two capability systems side by side — nothing
  outside `Runtime`'s constructor currently depends on them, so this is a
  clean removal, not a migration. If a future need for cross-module
  (non-storage) capability lookup emerges, that's a separate decision, not
  a reason to keep the storage-specific case name-keyed today.

## Consequences (if accepted and built)

- `Runtime`/`Pipeline` code asks `storage.supports('HybridSearch')`
  instead of checking `provider.type` or the adapter's class name.
- Every existing adapter (`MongoAdapter`, `PostgresAdapter`, `RedisAdapter`,
  `MemoryAdapter`) needs a real `supports()` implementation as part of
  becoming non-placeholder — this is a natural fit to add at the same time
  each adapter's `__placeholder` marker comes off (see ADR-0006), not a
  separate migration pass across all four at once.
- `tests/contracts/plugin-sdk-contract.ts` gets a new case: a minimal
  adapter implementing `supports()` for a subset of capabilities, proving
  a partial/honest implementation (declaring `HybridSearch: false` rather
  than omitting the method) is possible and expected.
- This does not fit any of the five existing extension points
  (`docs/architecture/extension_points.md`) — it's a change to the
  `MemoryRepository` contract itself, not a new instance of an existing
  one. Every adapter, including third-party ones built against
  `src/sdk/plugin-sdk.ts`, needs a code change when this lands — worth
  timing deliberately (a minor version, with the new method documented as
  required) rather than adding silently.
