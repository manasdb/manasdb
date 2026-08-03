# Code Review Checklist

Each item below exists because a real instance of it happened in this
project's history, not as a generic best practice — the reference points
to where.

## Type safety

- [ ] No new `any` or bare `Record<string, unknown>` on a public method's
      parameters or return type. (`docs/DESIGN_PRINCIPLES.md`, "Strong
      typing"; `AbsorbOptions`/`UpdateFields`/`Metadata`/`FilterExpression`
      are the pattern to follow.)
- [ ] If a PR removes an `as any` cast, actually run `tsc --noEmit` against
      it rather than assuming the cast was hiding nothing — removing one
      previously surfaced a real name mismatch between a facade method and
      the class it delegated to (`update`/`search`/`batchAbsorb` calling
      methods that didn't exist under those names).
- [ ] A genuinely unsafe cast (bridging two interfaces that don't
      structurally match) is acceptable *only* if it's commented in place
      explaining why it's safe today and what would make it unsafe — see
      `LegacyManasDB.createStorageProvider()` for the pattern.

## Fail-fast

- [ ] Nothing returns `[]`/`0`/`null` to represent "not implemented yet."
      It throws `FeatureNotImplementedError`, explicitly. (ADR-0006 — this
      project's storage adapters did exactly the wrong thing for a period
      before this was adopted as a rule.)
- [ ] A new scaffold (adapter, engine method, cognitive stage) is either
      clearly marked as such (`__placeholder`, a "Mock for now" comment) or
      fully real — not an ambiguous in-between.

## Architecture

- [ ] Check the actual import statements, not just the intent, against
      `docs/architecture/dependency_graph.md` before approving. Two real
      violations (`MongoAdapter` importing from `runtime/registry/`, an
      unused `Runtime` import inside `OperationRouter`) existed for a
      while specifically because nobody checked imports line-by-line
      during review — `tests/architecture/architecture-ts.ts` now catches
      both, but new invariants only get added once someone notices.
- [ ] If `tests/architecture/architecture-ts.ts` changed, verify its
      `.catch()` actually calls `process.exit(1)` on failure — a
      `.catch(console.error)` alone logs an error but exits 0, meaning a
      broken invariant would silently pass CI. (This exact bug existed in
      that file.)

## Tests

- [ ] A new test that's supposed to fail on a real problem — actually try
      breaking the thing it tests and confirm the test catches it, rather
      than trusting the test's logic by inspection. (`tests/security/test-sql-injection.ts`'s
      skip condition looked right by inspection and still had a bug —
      it only checked whether `POSTGRES_URI` was *set*, not whether it was
      *reachable*, and failed instead of skipping the first time it hit a
      real unreachable database.)
- [ ] A test moved to a new directory — check its internal relative paths
      (`path.join(import.meta.dirname, ...)`), not just its import
      statements. A directory move broke `architecture-ts.ts`'s path to
      `src/` this way once.

## Public API

- [ ] Anything reachable from `new ManasDB(...)` changing shape → flagged
      explicitly in the PR description and checked against
      `docs/STABILITY.md`, not left for the reviewer to notice from the
      diff alone.
