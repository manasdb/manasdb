# Architecture Freeze

## What's frozen, and what isn't

**Frozen (needs an ADR + likely a major-version conversation to change):**
- The public API surface — see `docs/STABILITY.md`. This is the only
  thing with a hard, mechanically-enforced freeze
  (`tests/contracts/api-snapshot.ts`).
- The five extension points (`docs/architecture/extension_points.md`) as
  *the* set of sanctioned places to add functionality. Adding a sixth kind
  of extension point, or a second top-level orchestrator/router, is an
  architecturally significant change requiring its own ADR — see "What
  needs an ADR" below.
- The dependency direction (`docs/architecture/dependency_graph.md`).
  `Runtime` not importing adapters, intents not touching storage directly,
  `OperationRouter` staying free of storage/Runtime imports — these are
  checked by `tests/architecture/architecture-ts.ts` specifically because
  they've been violated in practice before (see
  `docs/governance/CODE_REVIEW_CHECKLIST.md`) and are cheap to keep
  enforced once broken once.

**Not frozen — expected to keep changing:**
- Everything under `src/runtime/`, `src/pipeline/`, `src/storage/`,
  `src/legacy/`, `src/providers/` internally. The entire Runtime rewrite
  happened here without touching the frozen surface above.
- Which `PipelineStrategy` operations default to `'legacy'` vs
  `'runtime'` — this is expected to change release over release as
  migration progresses.
- Anything documented in `docs/architecture/` — those docs describe the
  current shape, not a commitment to keep it.

## What needs an ADR

A new file in `docs/adr/`, following the existing format (Date / Status /
Context / Decision / Consequences), is expected for:

- Introducing a new extension point beyond the current five, or a new
  subsystem at the same level as `Runtime`/`Pipeline`/`OperationRouter`/
  `StorageProvider` (Capability Discovery — see ADR-0008 and below — was
  exactly this kind of decision, which is why it got an ADR marked
  Proposed before any code was written, not after).
- Reversing a previous ADR's decision (e.g., un-freezing something listed
  above, or changing the dependency direction rules).
- Any change to what counts as "public API" per `docs/STABILITY.md`.

A new storage adapter, a new middleware, a new intent, a new scheduler
job, or a new cognitive module — the five existing extension points —
do NOT need an ADR just for existing. They need one only if adding them
requires bending one of the frozen rules above to fit.

## A live example of "not now, but eventually" being handled correctly

A capability-detection layer — `StorageProvider.supports("HybridSearch")`
instead of `if (provider.type === "mongodb")` — has been proposed as a
post-0.6.0 addition, and now has a formal ADR:
**`docs/adr/0008-capability-discovery.md`, Status: Proposed.** Worth
noting why it went through this doc's process rather than straight to
code: partial groundwork already existed and was currently unused
(`ModuleManifest.capabilities`, `Runtime`'s dead `CapabilityRegistry`) —
the ADR is what made the decision explicit (retire the old, name-keyed
scaffolding rather than build a second, instance-keyed system beside it)
instead of that decision getting made implicitly by whoever happened to
write the code first.
