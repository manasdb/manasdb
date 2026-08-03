# Roadmap

Maintainer-facing — tracks what's actually next and why, not a marketing
timeline. See `docs/VISION.md` (if present) for the long-arc story;
this is the concrete next-few-releases list.

## In progress / next up (0.6.x → 0.7)

- Migrate `absorb` to the Runtime path for real: implement `MongoAdapter`
  (or `MemoryAdapter`, as the first target — it's closer to real already)
  fully, remove its `__placeholder` marker, flip
  `PipelineStrategy.absorb` to `'runtime'` behind
  `OperationRouter.__setStrategyForMigration()`, and get
  `tests/compatibility/compat-tests.ts` green for that operation
  specifically before touching the next one. See
  `docs/architecture/execution_flow.md`.
- Build a real translation layer between `BaseProvider` (legacy drivers)
  and `MemoryRepository` (Runtime path) — the gap documented in ADR-0004
  and at the cast site in `LegacyManasDB.createStorageProvider()`. This
  needs to exist before *any* operation can safely migrate to `'runtime'`
  against a legacy-backed connection, which is the common case today
  (nothing uses the scaffold adapters yet).

## Known gaps, tracked rather than hidden

- **`tests/` isn't type-checked.** `tsconfig.json` excludes it. Expanding
  `include` to cover `tests/**/*` currently surfaces ~76 errors across the
  suite — a real, separate cleanup project, not something to squeeze into
  an unrelated PR. Whoever picks this up should expect to spend real time
  on it, not treat it as a quick config flip.
- **No committed benchmark baseline.** `npm run bench` runs in CI as an
  informational, non-blocking step. Generate a real baseline on CI
  hardware (`npm run bench:baseline`) and commit it before this can become
  a meaningful regression gate.
- **No lint step.** No ESLint config exists. Adding one is a style/rules
  decision that shouldn't be improvised inside an unrelated cleanup pass —
  it needs its own decision (and probably its own ADR, given
  `docs/governance/ARCHITECTURE_FREEZE.md`'s bar for what needs one is
  "would a contributor be confused without a decision recorded").
- **No coverage threshold.** Same reasoning — needs a deliberate choice of
  tool and number, not a default.
- **The `MongoConnection` static-singleton bug.** `migrateTo()` can
  silently reuse the first Mongo connection and ignore a second URI if
  both configs point at Mongo. Tracked, explicitly deferred (see the
  connection-sharing design conversation this repo's history includes),
  not forgotten.

## Not on the roadmap yet, but proposed and worth a future ADR

- **Capability Discovery** (`StorageProvider.supports("HybridSearch")`
  instead of type-checking `provider.type`). See **ADR-0008** (`docs/adr/0008-capability-discovery.md`,
  Status: Proposed) for the concrete design, including why the existing,
  currently-dead `CapabilityRegistry`/`ModuleManifest.capabilities`
  scaffolding is name-keyed rather than instance-keyed and the ADR
  proposes retiring it rather than building a second system alongside it.

## 1.0

Reserved for full Runtime-path parity across every `PipelineStrategy`
operation, per ADR-0007 and `docs/governance/VERSIONING.md`. Not a target
date — a condition.
