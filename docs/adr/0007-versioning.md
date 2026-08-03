# 7. Versioning: 0.5 → 0.6

Date: 2026-08-03

## Status

Accepted

## Context

The work described in ADRs 0001–0006 fundamentally changed what's
underneath `new ManasDB(...)` — from a single monolithic class to a
layered Kernel/Runtime/Pipeline/OperationRouter/StorageProvider
architecture — while the public API itself didn't change at all. A pure
patch bump (0.5.0 → 0.5.x) undersells the scope of what changed
internally; a major bump (→ 1.0) overstates it, since 1.0 is meant to mark
the point where the Runtime path has actually replaced the legacy path for
every operation, which hasn't happened yet — every `PipelineStrategy` flag
still defaults to `'legacy'` today.

## Decision

This is a minor version bump: 0.6.0. Per `docs/STABILITY.md`'s semver
section, a minor bump is exactly the right size for "internal
architecture changed substantially, public API did not" — new
capabilities may be added, nothing existing changes shape.

## Consequences

- 0.6.0 should be documented and released as what it is: the foundation
  the rest of the migration builds on, not a feature release. The
  changelog entry should categorize by area (Architecture, Runtime,
  Storage, Developer Experience, Security, Compatibility) rather than
  listing commits chronologically.
- 1.0 is reserved for the milestone where every `PipelineStrategy` flag
  can default to `'runtime'` with full behavioral parity proven by
  `tests/compatibility/compat-tests.ts` — at that point the legacy engine
  becomes deletable, which is itself the kind of change that would
  justify a major version if it ever changed observable behavior (it
  shouldn't, per ADR-0006, but removing an entire code path warrants the
  higher bump as a signal regardless).
- Every 0.6.x, 0.7.x, etc. release in between is expected to migrate one
  or a few operations from `'legacy'` to `'runtime'` — see
  `docs/architecture/execution_flow.md` — without any public-facing
  version implication beyond "internals kept changing, as promised."
