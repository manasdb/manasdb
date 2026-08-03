/**
 * Plugin SDK — for contributors extending ManasDB, not for application
 * code using it (that's `import { ManasDB } from '@manasdb/core'`, see
 * docs/STABILITY.md). This file is the one place to import from when
 * building any of the five sanctioned extension points
 * (docs/architecture/extension_points.md):
 *
 *   class MyMiddleware implements Middleware { ... }
 *   class MyAdapter implements MemoryRepository { ... }
 *   class MyIntent extends CognitiveIntent { ... }
 *   class MyJob extends SchedulerJob { ... }
 *
 * (Cognitive modules — the fifth extension point — don't have a base
 * class yet; memory.cognitive.* wires directly to CognitiveIntent
 * subclasses today. See docs/architecture/extension_points.md, "5. A new
 * cognitive module.")
 *
 * Naming note: what this SDK exports as `MemoryRepository` is the
 * interface a storage backend implements — some designs call this
 * "StorageAdapter." That name is already used for something unrelated in
 * this codebase (src/contracts/index.ts's internal `StorageAdapter`, used
 * only by src/utils/logger.ts) — re-using it here for a different
 * interface would be confusing, so this SDK keeps the real internal name.
 *
 * This barrel re-exports; it doesn't redefine anything. Each type's real
 * home is documented next to it below, and that's still where its actual
 * logic and doc comments live.
 */

// --- Middleware (docs/architecture/pipeline.md, extension_points.md #2) ---
export type { Middleware } from '../pipeline/index.ts';
export { OperationContext, PipelineEngine } from '../pipeline/index.ts';

// --- Storage adapter (docs/architecture/storage.md, extension_points.md #1) ---
export type { MemoryRepository } from '../domain/repositories/MemoryRepository.ts';
export { Memory, MemoryChunk } from '../domain/entities/Memory.ts';
export type { Vector } from '../domain/value-objects/Vector.ts';
export { StorageProvider } from '../storage/providers/StorageProvider.ts';

// --- Intent (docs/architecture/execution_flow.md, extension_points.md #3) ---
export { CognitiveIntent } from '../runtime/execution/intent.ts';

// --- Scheduler job (extension_points.md #4) ---
export { SchedulerJob, Scheduler } from '../runtime/scheduler/index.ts';
export type { JobOptions, JobHandler } from '../runtime/scheduler/index.ts';

// --- Errors every extension point is expected to use, per ADR-0006 ---
// (fail fast — throw these explicitly rather than a silent empty result)
export {
  FeatureNotImplementedError,
  ConfigError,
  StorageNotReadyError,
} from '../errors/index.ts';

// --- The guard every storage adapter should be aware of (docs/architecture/storage.md) ---
export { assertStorageReady, isMemoryRepositoryReady } from '../storage/guard.ts';
