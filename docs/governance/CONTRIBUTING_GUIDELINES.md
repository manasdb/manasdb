# Contributing Guidelines

This is the maintainer-facing version — for the quick "how do I get set
up" version, see the README's Contributing section. This doc is about
what makes a contribution mergeable, not how to clone the repo.

## Before writing code

- Check `docs/architecture/extension_points.md`. If what you're building
  fits one of the five listed extension points (storage adapter,
  middleware, intent, scheduler job, cognitive module), build it there.
  If it doesn't fit any of them, that's a signal to open an issue or
  discussion first — not a reason to add a second router or a parallel
  orchestration path (see `docs/DESIGN_PRINCIPLES.md`, "Feature additions
  through extension points").
- Check `docs/STABILITY.md` if your change touches anything reachable from
  `new ManasDB(...)`. A public API change needs to be called out
  explicitly in the PR description, not discovered in review.

## While writing code

- **No `Record<string, unknown>` (or bare `any`) on anything public** —
  see `docs/DESIGN_PRINCIPLES.md`, "Strong typing." Add a named type to
  `src/types/index.ts`, even if it's structurally a generic map today
  (`Metadata`, `FilterExpression` are the precedent).
- **Nothing half-built gets a silent empty return.** If a method isn't
  implemented yet, it throws `FeatureNotImplementedError` explicitly. A
  scaffold storage adapter self-declares `__placeholder = true as const`.
  See ADR-0006.
- **Follow the dependency graph** (`docs/architecture/dependency_graph.md`).
  If you're not sure whether an import you're adding violates it, add the
  check to `tests/architecture/architecture-ts.ts` and see if it passes —
  that file is meant to grow as new invariants get identified, including
  ones found by accident (two of the six current invariants were added
  after discovering real, existing violations, not written speculatively).

## Before opening the PR

- [ ] `npm run build && npm run typecheck && npm run test:safety-net` all
      green locally.
- [ ] New public method/type/behavior → `tests/contracts/api-snapshot.ts`
      updated in the same PR (it's designed to fail otherwise — that's the
      point, not a bug in the test).
- [ ] Architecturally significant change → an ADR in `docs/adr/` in the
      same PR. "Architecturally significant" roughly means: would a
      contributor reading `docs/architecture/architecture_overview.md` in
      six months be confused about why this exists without an ADR to
      point to?
- [ ] Touched a storage adapter → confirm it either stays `__placeholder`
      (if not fully real) or has the marker removed *and* every method
      genuinely does something (not "removed the marker but `findSimilar`
      still returns `[]`").

## Code review checklist

See `docs/governance/CODE_REVIEW_CHECKLIST.md` — this file is about what
you do before requesting review; that one is what a reviewer checks.
