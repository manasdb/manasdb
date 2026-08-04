import type { MemoryRepository } from '../domain/repositories/MemoryRepository.ts';
import { StorageNotReadyError } from '../errors/index.ts';

/**
 * guard.ts — keeps placeholder / incomplete storage adapters out of the
 * 'runtime' execution path.
 *
 * Two independent things can make an adapter unsafe to use:
 *   1. It's an intentional scaffold — it self-declares `__placeholder = true`
 *      (see MongoAdapter/PostgresAdapter/RedisAdapter/MemoryAdapter). This is
 *      the only reliable signal, because a stub method ("findSimilar() { return []; }")
 *      is structurally indistinguishable from a real one that just found no
 *      results — presence-of-method can never prove correctness, only the
 *      adapter author declaring "not ready yet" can.
 *   2. It doesn't implement the full MemoryRepository contract at all — e.g.
 *      a legacy `BaseProvider`-shaped driver (insert/vectorSearch/keywordSearch)
 *      wrapped as if it were a MemoryRepository (save/findSimilar/findKeyword).
 *      These are NOT the same interface, and calling a missing method throws
 *      a confusing "X is not a function" deep inside a pipeline middleware.
 *      This guard turns that into one clear, actionable error instead.
 *
 * Where this is (and isn't) called:
 *   Intentionally NOT checked at RuntimeBuilder.build() / Runtime.start() time.
 *   A Runtime can legitimately be constructed with legacy-shaped storage while
 *   every PipelineStrategy flag is still 'legacy' — that's the normal state
 *   for most of this migration. The check only matters at the moment an
 *   operation is actually about to be routed to 'runtime' (see RuntimeEngine),
 *   since that's the first point anything tries to call a MemoryRepository
 *   method on the wrapped object.
 */

const REQUIRED_METHODS: (keyof MemoryRepository)[] = [
  'init',
  'save',
  'findById',
  'findSimilar',
  'findKeyword',
  'delete',
  'deleteMany',
  'clear',
  'getManifest',
  'updateManifest',
  'getMonthlySpend',
  'expireOlderThan',
  'list'
];

export { StorageNotReadyError };

/**
 * True only if `candidate` is a fully-implemented, non-placeholder
 * MemoryRepository. This checks *shape and self-declaration*, not behavior —
 * it cannot tell a correct implementation from a stub that happens to return
 * plausible-looking values, which is exactly why placeholder adapters must
 * opt in to `__placeholder = true` rather than relying on this function to
 * infer it.
 */
export function isMemoryRepositoryReady(candidate: unknown): candidate is MemoryRepository {
  if (!candidate || typeof candidate !== 'object') return false;
  if ((candidate as { __placeholder?: boolean }).__placeholder === true) return false;
  return REQUIRED_METHODS.every(method => typeof (candidate as Record<string, unknown>)[method] === 'function');
}

/**
 * Throws StorageNotReadyError if `candidate` cannot safely back a
 * 'runtime'-routed operation. Call this immediately before dispatching to
 * the Runtime engine for a given capability (absorb / recall / update / ...).
 *
 * @param candidate the object the caller is about to treat as a MemoryRepository
 * @param operation  the capability being attempted, e.g. "absorb" — used only
 *                    to make the thrown message actionable, not for logic.
 */
export function assertStorageReady(candidate: unknown, operation: string): asserts candidate is MemoryRepository {
  if (!isMemoryRepositoryReady(candidate)) {
    throw new StorageNotReadyError(
      `[ManasDB] Cannot execute "${operation}" via the Runtime pipeline: the current storage adapter ` +
      `is either an explicit placeholder scaffold or does not fully implement MemoryRepository. ` +
      `Set PipelineStrategy.${operation} = 'legacy' until a real adapter is wired in, or finish ` +
      `implementing the adapter and remove its __placeholder marker.`
    );
  }
}
