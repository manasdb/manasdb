# Design Principles

These aren't aspirational — each one is written the way it is because a
real decision in this codebase's history went the other way first, and
got walked back. Where that's true, it's noted, so this reads as "why,"
not just "what."

## Public API first

`new ManasDB(...)` and its methods are designed before the internals that
serve them, not the other way around. The entire Runtime/OperationRouter
rewrite happened *underneath* an unchanged public surface — see
`docs/STABILITY.md`. When a new capability is being designed, the question
is "what does `memory.absorb()` need to look like," not "what does the
Pipeline need to look like" — the latter follows from the former.

## Backward compatibility by default

A public method's behavior for a given input doesn't change without a
major version bump (see `docs/STABILITY.md`). Internally, this shows up as
`OperationRouter` routing every operation through a `'legacy'`/`'runtime'`
strategy that defaults to whichever engine is already proven correct —
new implementations have to earn their way to being the default via
`tests/compatibility/compat-tests.ts`, not replace the old path outright.

## Existing databases instead of reinventing storage

ManasDB is not a vector database — see `docs/NON_GOALS.md` if that exists,
or the README's "Why ManasDB Exists" section. It's a layer on top of
MongoDB, PostgreSQL, Redis, and an in-memory store, adding retrieval
intelligence (hybrid search, reasoning, caching) at the storage layer
rather than asking you to run and operate a new kind of database.

## Composition over inheritance

`StorageProvider` composes an `adapter` (`MemoryRepository`) rather than
subclassing one. `OperationRouter` composes a `LegacyEngine` and a
`RuntimeEngine` — both implementing `OperationEngine` — rather than one
inheriting from the other. The one place this project used inheritance
for a similar purpose (`BaseProvider`, subclassed by `MongoProvider`/
`PostgresProvider`/`RedisProvider`/`MemoryProvider`) predates the
Runtime-era code and is exactly why `MemoryRepository` exists as a
separate interface rather than another `BaseProvider` subclass — it's
easier to swap a composed adapter than to safely change a shared base
class four subclasses depend on.

## Strong typing

`Record<string, unknown>` is acceptable for genuinely open-ended shapes
(arbitrary user tags in a filter, arbitrary metadata) but not as a
default for "I don't want to define the type yet." Every public method's
options and return values have a named type in `src/types/index.ts` — see
`UpdateFields`, `ForgetManyResult`, `ProviderHealthStatus`, etc. Where a
generic map is genuinely the right shape, it still gets a name
(`Metadata`, `FilterExpression`) rather than appearing as a bare
`Record<string, unknown>` at the call site.

## Middleware for cross-cutting concerns

Validation, telemetry, PII redaction, and storage access on the Runtime
path are each meant to be one `Middleware` registered on `PipelineEngine`
— not logic threaded through every `CognitiveIntent` individually. See
`docs/architecture/pipeline.md` for the current, honest state of this (one
middleware registered today, not the full aspirational chain) and
`docs/architecture/extension_points.md` for how to add the next one.

## Runtime isolation

`Runtime` doesn't import concrete adapters, `CognitiveIntent`s don't touch
storage directly, and `OperationRouter` doesn't know `Runtime` exists at
all — only the `OperationEngine` interface both engines implement. See
`docs/architecture/dependency_graph.md`. This one has a specific
regression history worth knowing: an earlier revision had `Runtime`
exported as a module-level singleton (`export const runtime = new
Runtime()`), which silently broke multi-instance usage (two `ManasDB`
instances with different configs sharing one Runtime). `Runtime` is now
constructed per-`ManasDB`-instance via `RuntimeBuilder`, and
`tests/architecture/architecture-ts.ts` checks that the singleton doesn't
reappear.

## Fail fast

A method that isn't implemented yet throws `FeatureNotImplementedError`
explicitly — it does not return an empty array, `null`, or a
plausible-looking zero and let the caller mistake that for a real answer.
This project has a specific, repeated history with the alternative: the
original Runtime-path storage adapters (`MongoAdapter`, `PostgresAdapter`,
`RedisAdapter`) returned `[]`/`0`/`null` from every method for months
before failing loudly was adopted as the rule (see
`docs/architecture/storage.md`, "The double-guard against a placeholder
going live"). Silent empty results look like "no matches found" right up
until someone ships on top of them.

## Feature additions through extension points

New storage backends, middleware, intents, scheduler jobs, and cognitive
modules each have one designated place to be added — see
`docs/architecture/extension_points.md`. The rule stated there is worth
repeating here: if a new feature doesn't fit one of the five listed
extension points, that's a signal to open a design conversation (an ADR
in `docs/adr/`), not to add a second `Pipeline`, a second router, or a new
top-level orchestration class next to the ones that already exist.
