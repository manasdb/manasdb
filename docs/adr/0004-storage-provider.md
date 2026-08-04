# 4. StorageProvider and the MemoryRepository Contract

Date: 2026-08-02

## Status

Accepted

## Context

The legacy engine's database drivers (`MongoProvider`, `PostgresProvider`,
`RedisProvider`, in `src/providers/`) implement `BaseProvider` —
`insert()`, `vectorSearch()`, `keywordSearch()`, `health()`, and similar
methods, named around what each concrete database naturally does. The
Runtime path needed a storage abstraction too, but reusing `BaseProvider`
directly would have coupled `Runtime` to every historical decision made
for the legacy engine's shape, including method names that don't
generalize well (`vectorSearch` vs. a more neutral `findSimilar`).

## Decision

Define a new, narrower interface, `MemoryRepository`
(`src/domain/repositories/MemoryRepository.ts`) — `save`, `findById`,
`findSimilar`, `findKeyword`, `delete`, `deleteMany`, `clear`,
`getManifest`, `updateManifest`, `getMonthlySpend`, `expireOlderThan`,
`list` — and a thin `StorageProvider` class that implements
`MemoryRepository` by delegating to a composed adapter. `Runtime` depends
only on `StorageProvider`, never on a concrete adapter.

## Consequences

- `MemoryRepository` and `BaseProvider` are two different interfaces, not
  interchangeable. A legacy driver does not structurally satisfy
  `MemoryRepository` — this was discovered as a real, existing gap in
  `LegacyManasDB.createStorageProvider()` (documented at the cast site and
  in `docs/architecture/storage.md`), not designed in on purpose. Bridging
  the two properly needs a real translation adapter, which does not exist
  yet — the connection-sharing code casts across the gap explicitly and
  is safe today only because every `PipelineStrategy` flag defaults to
  `'legacy'`, so nothing calls through the cast object yet.
- New storage backends (`src/storage/adapters/`) implement
  `MemoryRepository` directly — composition, not inheriting `BaseProvider`.
- Every adapter shipped so far is a scaffold, self-declaring
  `__placeholder = true` and throwing `FeatureNotImplementedError` from
  every data-plane method rather than returning a plausible-looking empty
  result. See ADR-0006 and `docs/architecture/storage.md`, "The
  double-guard against a placeholder going live."
