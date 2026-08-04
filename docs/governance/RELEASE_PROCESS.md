# Release Process

## What actually happens today

`.github/workflows/ci-cd.yml`, on push to `develop`:

1. `npm install`
2. `npm run build` (esbuild — syntax/transpilation check, not a type-check)
3. `npm run typecheck` (`tsc --noEmit` — currently clean against `src/**/*`;
   `tests/**/*` is not yet in scope, see `docs/architecture/` for why)
4. `npm run test:safety-net` — the network-independent-where-possible core
   suite (see the comment at the top of that script and
   `docs/DESIGN_PRINCIPLES.md`'s "Fail fast" section for what's actually
   covered). Note honestly: several of these tests use the `transformers`
   embedding source and need real network access to fetch the model on a
   cold cache — this gate is not fully hermetic today.
5. `npm run bench` — informational only (`continue-on-error: true`), no
   committed baseline yet (see step 5 below).
6. If all of the above succeeded, `develop` is auto-merged into `main`.

On push to `main` (which the auto-merge above triggers): rebuild,
re-typecheck, re-run the safety-net suite, then `npm publish`.

## Before merging a PR into `develop`

- [ ] `npm run build`, `npm run typecheck`, `npm run test:safety-net` all
      pass locally (CI will re-check, but don't rely on CI to find syntax
      errors for you).
- [ ] If you touched `src/runtime/`, `src/pipeline/`, `src/storage/`, or
      `src/runtime/compatibility/`, run `npm run test:architecture` — CI
      runs it as part of the safety-net, but the failure messages are
      clearer running it directly.
- [ ] If you changed anything reachable from `new ManasDB(...)`, check
      `docs/STABILITY.md` — a signature or behavior change there needs a
      major-version conversation, not a quiet PR.
- [ ] If the change is architecturally significant (a new subsystem, a
      reversal of an existing ADR's decision), write an ADR in `docs/adr/`
      as part of the same PR — see `docs/governance/ARCHITECTURE_FREEZE.md`.

## Cutting a release

1. Confirm every `PipelineStrategy` flag currently flipped to `'runtime'`
   (if any — none are, as of 0.6.0) has a green
   `tests/compatibility/compat-tests.ts` run behind it.
2. Update `CHANGELOG.md`, categorized (Architecture / SDK / Runtime /
   Pipeline / Storage / Developer Experience / Security / Compatibility) —
   not a flat commit list. See ADR-0007 for why 0.6.0 specifically was
   categorized this way.
3. Bump the version per `docs/governance/VERSIONING.md`.
4. Push to `main` (or let the `develop` auto-merge do it) — publish is
   automatic once the safety-net suite is green there.

## What this process does not yet cover

There's no dedicated performance-regression gate (the benchmark step is
informational, not blocking — see `docs/governance/ROADMAP.md`), no lint
step (no ESLint config exists yet), and no coverage threshold. These are
known gaps, not oversights being hidden — track them as roadmap items
rather than assuming they're silently enforced somewhere.
