import type { OperationEngine } from './engine.ts';
import type {
  AbsorbResult, RecallResult, DeleteResult, AbsorbOptions, RecallOptions,
  UpdateResult, SearchResult, UpdateFields, ManasDBConfig, MemoryChunk,
  TelemetryEvent, ProviderHealthStatus, ForgetManyResult, DedupResult,
  ExpireResult, MigrateResult,
  FilterExpression
} from '../../types/index.ts';

export type PipelineMode = 'legacy' | 'runtime';

// Only operations with a genuine dual (legacy + runtime) implementation get
// a migration flag. The administrative operations below (clear, export,
// migrateTo, ...) have no cognitive-runtime equivalent to migrate *to* yet —
// they still route through OperationRouter (see the "one entry point" rule),
// but unconditionally to the legacy engine, since a toggle with only one
// working position isn't a real migration control.
export interface PipelineStrategy {
  absorb: PipelineMode;
  recall: PipelineMode;
  update: PipelineMode;
  delete: PipelineMode;
  search: PipelineMode;
}

/**
 * OperationRouter — the single entry point for every public ManasDB
 * operation, not just the CRUD core.
 *
 * Responsibility: decide which engine handles each operation.
 * Nothing else.
 *
 * No intent construction.
 * No pipeline references.
 * No storage access.
 * No business logic.
 *
 * Two collaborators:
 *   LegacyEngine  — handles operations when strategy is 'legacy'
 *   RuntimeEngine — handles operations when strategy is 'runtime'
 *
 * Every method on OperationEngine has a corresponding method here, even the
 * administrative ones that always resolve to `_legacy` today. That's
 * deliberate: `ManasDB` (src/index.ts) never calls `_legacy` directly for
 * anything, so migrating any future operation to the Runtime path is a
 * change confined to this file plus RuntimeEngine — never to the facade.
 */
export class OperationRouter {
  private _strategy: PipelineStrategy = {
    absorb: 'legacy',
    recall: 'legacy',
    update: 'legacy',
    delete: 'legacy',
    search: 'legacy'
  };

  constructor(
    private readonly _legacy: OperationEngine,
    private readonly _runtime: OperationEngine
  ) { }

  /**
   * Flip one or more operations between 'legacy' and 'runtime' at a time.
   *
   * NOT PART OF THE PUBLIC API. `ManasDB` (src/index.ts) never calls or
   * exposes this — the public facade has no way to reach it, by design.
   * It exists for internal migration tooling and test harnesses that
   * construct an OperationRouter directly (see test-legacy-routing.ts),
   * so each Milestone can flip exactly the operation it just finished
   * migrating without editing this file. Partial updates are merged —
   * `setStrategy({ absorb: 'runtime' })` only changes `absorb`.
   */
  public __setStrategyForMigration(partial: Partial<PipelineStrategy>): void {
    this._strategy = { ...this._strategy, ...partial };
  }

  /** Read-only snapshot, mainly for assertions in migration test harnesses. */
  public __getStrategyForMigration(): Readonly<PipelineStrategy> {
    return { ...this._strategy };
  }

  public async absorb(text: string, options: AbsorbOptions = {}): Promise<AbsorbResult> {
    return this._strategy.absorb === 'runtime'
      ? this._runtime.absorb(text, options)
      : this._legacy.absorb(text, options);
  }

  public async recall(query: string, options: RecallOptions = {}): Promise<RecallResult[]> {
    return this._strategy.recall === 'runtime'
      ? this._runtime.recall(query, options)
      : this._legacy.recall(query, options);
  }

  public async reasoningRecall(query: string, options: RecallOptions = {}): Promise<RecallResult[]> {
    // Deferred: always legacy until Runtime CRUD migration is complete
    return this._legacy.reasoningRecall(query, options);
  }

  public async update(id: string, updates: UpdateFields): Promise<UpdateResult> {
    return this._strategy.update === 'runtime'
      ? this._runtime.update(id, updates)
      : this._legacy.update(id, updates);
  }

  public async search(query: string, options: RecallOptions = {}): Promise<SearchResult[]> {
    return this._strategy.search === 'runtime'
      ? this._runtime.search(query, options)
      : this._legacy.search(query, options);
  }

  public async batchAbsorb(texts: string[], options: AbsorbOptions = {}): Promise<AbsorbResult[]> {
    return this._strategy.absorb === 'runtime'
      ? this._runtime.batchAbsorb(texts, options)
      : this._legacy.batchAbsorb(texts, options);
  }

  public async forget(id: string): Promise<DeleteResult> {
    return this._strategy.delete === 'runtime'
      ? this._runtime.forget(id)
      : this._legacy.forget(id);
  }

  // ------------------------------------------------------------------
  // Administrative surface — one entry point, no dual strategy (yet).
  // ------------------------------------------------------------------

  public async exportData(): Promise<unknown> {
    return this._legacy.exportData();
  }

  public async importData(data: unknown): Promise<void> {
    return this._legacy.importData(data);
  }

  public async clear(): Promise<void> {
    return this._legacy.clear();
  }

  public async migrateTo(targetConfig: ManasDBConfig): Promise<MigrateResult> {
    return this._legacy.migrateTo(targetConfig);
  }

  public async getTelemetry(): Promise<TelemetryEvent[]> {
    return this._legacy.getTelemetry();
  }

  public async getStats(): Promise<ProviderHealthStatus[]> {
    return this._legacy.getStats();
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
