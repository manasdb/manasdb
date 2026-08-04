# Versioning

This restates `docs/STABILITY.md`'s semver section from the maintainer
side — read that first for what's covered by the public API guarantee at
all. This doc is about the mechanics of deciding a version bump; that one
is about what the guarantee means to a user.

## The three questions to ask, in order

1. **Did any public method's signature, or its documented behavior for a
   given input, change in a way existing code would need to adapt to?**
   If yes → major bump. This should be rare and deliberate — see
   `docs/governance/ARCHITECTURE_FREEZE.md`.
2. **Was anything added to the public surface — a new method, a new
   optional config field, a previously-`FeatureNotImplementedError`
   method becoming real?** If yes (and #1 is no) → minor bump. This is
   what 0.6.0 was (ADR-0007) and what most releases between now and 1.0
   are expected to be, one migrated `PipelineStrategy` operation at a
   time.
3. **Bug fixes, internal refactors, new internal architecture with zero
   public surface change?** → patch bump. Everything described in
   ADR-0001 through ADR-0006 happened at patch-bump internal scope before
   being packaged as the 0.6.0 minor release described in ADR-0007 —
   internal architecture work doesn't need its own version bump per
   change; it's fine to accumulate several ADRs' worth of internal change
   into one minor release once the surface-level story is coherent.

## What 1.0 specifically means here

Per ADR-0007: 1.0 is reserved for the point where every operation in
`OperationRouter`'s `PipelineStrategy` can default to `'runtime'` with full
parity proven by `tests/compatibility/compat-tests.ts`, and the legacy
engine becomes deletable. Not "feature complete," not "production ready"
in some general sense — a specific, checkable migration-completeness
condition. Don't bump to 1.0 for marketing reasons ahead of that.

## Practical note on this project's numbering so far

Releases prior to 0.5.1 (the Runtime Foundation work) used decimal patch
increments for what were, in retrospect, fairly substantial internal
changes. ADR-0007 marked a deliberate shift toward reserving minor bumps
for exactly the "internals changed substantially, public API didn't"
case — a useful signal being restored, not a new rule invented from
nothing.
