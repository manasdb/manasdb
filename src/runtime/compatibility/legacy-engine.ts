/**
 * LegacyEngine — adapter that satisfies OperationRouter.LegacyEngine.
 *
 * Thin wrapper over LegacyManasDB that normalises the call signatures
 * to match the interface OperationRouter expects.
 * No business logic — purely structural adaptation.
 */
import type { OperationEngine } from './engine.ts';
import type { LegacyManasDB } from '../../legacy/LegacyManasDB.ts';
import type {
  AbsorbResult, RecallResult, DeleteResult, AbsorbOptions, RecallOptions,
  UpdateResult, SearchResult, UpdateFields, ManasDBConfig, MemoryChunk,
  TelemetryEvent, ProviderHealthStatus, ForgetManyResult, DedupResult,
  ExpireResult, MigrateResult,
  FilterExpression
} from '../../types/index.ts';

export class LegacyEngine implements OperationEngine {
  constructor(private readonly _legacy: LegacyManasDB) {}

  public async absorb(text: string, options?: AbsorbOptions): Promise<AbsorbResult> {
    return this._legacy.absorb(text, options);
  }

  public async recall(query: string, options?: RecallOptions): Promise<RecallResult[]> {
    return this._legacy.recall(query, options);
  }

  public async reasoningRecall(query: string, options?: RecallOptions): Promise<RecallResult[]> {
    // LegacyManasDB.reasoningRecall only accepts { topSections?, topSection? } —
    // a narrower shape than the public RecallOptions surface. Extra fields
    // were already silently ignored at runtime before this file was typed
    // against LegacyManasDB directly; this narrows the type honestly rather
    // than reintroducing an `any` to make the mismatch disappear.
    return this._legacy.reasoningRecall(query, options as { topSections?: number; topSection?: number } | undefined);
  }

  public async update(id: string, updates: UpdateFields): Promise<UpdateResult> {
    return this._legacy.update(id, updates);
  }

  public async search(query: string, options?: RecallOptions): Promise<SearchResult[]> {
    return this._legacy.search(query, options);
  }

  public async batchAbsorb(texts: string[], options?: AbsorbOptions): Promise<AbsorbResult[]> {
    return this._legacy.batchAbsorb(texts, options);
  }

  public async forget(id: string): Promise<DeleteResult> {
    await this._legacy.forget(id);
    return { deleted: true, id };
  }

  public async exportData(): Promise<unknown> {
    return this._legacy.export();
  }

  public async importData(data: unknown): Promise<void> {
    return this._legacy.import(data);
  }

  public async clear(): Promise<void> {
    return this._legacy.clearAll();
  }

  public async migrateTo(targetConfig: ManasDBConfig): Promise<MigrateResult> {
    return this._legacy.migrateTo(targetConfig);
  }

  public async getTelemetry(): Promise<TelemetryEvent[]> {
    return this._legacy.listTelemetry();
  }

  public async getStats(): Promise<ProviderHealthStatus[]> {
    return this._legacy.health();
  }

  public async clearTelemetry(): Promise<void> {
    return this._legacy.clearTelemetry();
  }

  public async dedup(options?: { minSimilarity?: number }): Promise<DedupResult> {
    return this._legacy.dedup(options);
  }

  public async expireOlderThan(duration: string | Date): Promise<ExpireResult> {
    return this._legacy.expireOlderThan(duration);
  }

  public async forgetMany(query: FilterExpression): Promise<ForgetManyResult> {
    return this._legacy.forgetMany(query);
  }

  public async list(limit?: number): Promise<MemoryChunk[]> {
    return this._legacy.list(limit);
  }
}
