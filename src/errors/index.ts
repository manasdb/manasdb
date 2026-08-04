export class ManasError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ConfigError extends ManasError {}
export class ProviderError extends ManasError {}
export class StorageError extends ManasError {}
export class EmbeddingError extends ManasError {}
export class ValidationError extends ManasError {}
export class CacheError extends ManasError {}
export class PipelineError extends ManasError {}
export class LifecycleError extends ManasError {}
export class FeatureNotImplementedError extends ManasError {}
export class RuntimeNotInitializedError extends LifecycleError {}
/**
 * Thrown by assertStorageReady() (src/storage/guard.ts) when a 'runtime'
 * routed operation is about to dispatch against a storage adapter that is
 * either an explicit __placeholder scaffold or missing part of the
 * MemoryRepository contract. Lives here (not in guard.ts) so it's part of
 * the same importable error hierarchy as every other ManasDB error —
 * `instanceof StorageNotReadyError` works the same way `instanceof
 * ConfigError` does, from the same module.
 */
export class StorageNotReadyError extends ManasError {}
