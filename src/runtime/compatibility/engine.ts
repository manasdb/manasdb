import type {
  AbsorbResult, RecallResult, DeleteResult, AbsorbOptions, RecallOptions,
  UpdateResult, SearchResult, UpdateFields, ManasDBConfig, MemoryChunk,
  TelemetryEvent, ProviderHealthStatus, ForgetManyResult, DedupResult,
  ExpireResult, MigrateResult,
  FilterExpression
} from '../../types/index.ts';

/**
 * OperationEngine — formal interface for any engine that can handle
 * every public ManasDB operation, not just the CRUD core.
 *
 * Implemented by both the Legacy engine (LegacyEngine adapter)
 * and the Cognitive engine (RuntimeEngine adapter). Every public
 * ManasDB method routes through OperationRouter against this interface —
 * even the ones RuntimeEngine can only throw "not implemented yet" for
 * today — so there is exactly one entry point, and flipping any one
 * operation to 'runtime' later never requires touching the router itself.
 */
export interface OperationEngine {
  absorb(text: string, options?: AbsorbOptions): Promise<AbsorbResult>;
  recall(query: string, options?: RecallOptions): Promise<RecallResult[]>;
  reasoningRecall(query: string, options?: RecallOptions): Promise<RecallResult[]>;
  forget(id: string): Promise<DeleteResult>;
  update(id: string, updates: UpdateFields): Promise<UpdateResult>;
  search(query: string, options?: RecallOptions): Promise<SearchResult[]>;
  batchAbsorb(texts: string[], options?: AbsorbOptions): Promise<AbsorbResult[]>;

  // Administrative surface — see OperationRouter for why these route too.
  exportData(): Promise<unknown>;
  importData(data: unknown): Promise<void>;
  clear(): Promise<void>;
  migrateTo(targetConfig: ManasDBConfig): Promise<MigrateResult>;
  getTelemetry(): Promise<TelemetryEvent[]>;
  getStats(): Promise<ProviderHealthStatus[]>;
  clearTelemetry(): Promise<void>;
  dedup(options?: { minSimilarity?: number }): Promise<DedupResult>;
  expireOlderThan(duration: string | Date): Promise<ExpireResult>;
  forgetMany(query: FilterExpression): Promise<ForgetManyResult>;
  list(limit?: number): Promise<MemoryChunk[]>;
}
