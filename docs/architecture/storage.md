# Storage

```
StorageProvider           (src/storage/providers/StorageProvider.ts)
  │  implements MemoryRepository, delegates every call to `adapter`
  ▼
Adapter                   (src/storage/adapters/{mongodb,postgres,redis,memory}.ts)
  │  implements MemoryRepository directly against a real database
  ▼
Database
```

## MemoryRepository — the contract

`src/domain/repositories/MemoryRepository.ts` defines the interface every
storage adapter must implement: `init`, `save`, `findById`, `findSimilar`,
`findKeyword`, `delete`, `deleteMany`, `clear`, `getManifest`,
`updateManifest`, `getMonthlySpend`, `expireOlderThan`, `list`. This is the
Generation 2 storage contract — deliberately narrower and more
consistently named than the legacy `BaseProvider` interface
(`src/providers/base.ts`), which the four `src/providers/*.ts` classes
(`MongoProvider`, `PostgresProvider`, etc.) implement instead. **The two
are not interchangeable** — a legacy provider does not structurally
satisfy `MemoryRepository` (it has `insert()`/`vectorSearch()`, not
`save()`/`findSimilar()`). Don't assume a legacy driver can be passed
anywhere a `MemoryRepository` is expected without an adapter layer between
them.

## The four adapters, and why they're all still scaffolds

`MongoAdapter`, `PostgresAdapter`, `RedisAdapter`, `MemoryAdapter` all
`implement MemoryRepository`, and all self-declare
`public readonly __placeholder = true as const;`. Every data-plane method
on the first three throws `FeatureNotImplementedError` rather than
returning an empty/zero result — deliberately, so a caller sees a loud,
clear failure instead of a query that silently "finds nothing." The one
exception is `MemoryAdapter`, whose `save`/`findById`/`delete`/`clear`/
`connect`/`disconnect` are real (a working in-process cache) — only
`findSimilar`/`findKeyword`/`deleteMany`/`updateManifest`/
`getMonthlySpend`/`expireOlderThan`/`list` still throw there.

**None of the four are wired into the live path today.** The
`StorageProvider` that `Runtime` is actually built with wraps whatever
`LegacyManasDB.createStorageProvider()` returns — the shared legacy
database driver, not one of these adapters (see `execution_flow.md`).
`storage/adapters/*` exist as the target shape for when each is actually
implemented; nothing currently constructs or uses them outside of
`tests/architecture-ts.ts`'s dependency check.

## The double-guard against a placeholder going live

Two independent layers stop an unfinished adapter from ever servicing a
real request:

1. **`assertStorageReady()`** (`src/storage/guard.ts`) — checked
   immediately before `RuntimeEngine.absorb/recall/forget` dispatch to
   `Runtime.executeTransaction()`. Throws `StorageNotReadyError` if the
   storage is either flagged `__placeholder` or missing any
   `MemoryRepository` method. This is the layer that actually matters day
   to day.
2. **The adapters throwing `FeatureNotImplementedError` themselves** — a
   second, redundant line of defense. Even if `assertStorageReady()` were
   ever bypassed (a direct unit test against an adapter, for instance),
   calling a fake method fails loudly instead of quietly returning `[]`.

Neither layer is checked at `Runtime` construction time — deliberately.
The legacy-wrapped driver doesn't fully satisfy `MemoryRepository` either
today, so a build-time check would fail on every existing setup, not just
the placeholder adapters. See `execution_flow.md` for why the check has to
live at dispatch time instead.

## Adding a new adapter

See `extension_points.md` — implement `MemoryRepository`, don't set
`__placeholder`, and make sure every method does something real before it
ships (the "does something real" part is exactly what the placeholder
adapters in this repo are still missing).
