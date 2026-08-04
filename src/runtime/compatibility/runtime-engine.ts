/**
 * RuntimeEngine — adapter that satisfies OperationRouter.RuntimeEngine.
 *
 * Responsibility: translate each operation call into a CognitiveIntent
 * and execute it through the Runtime transaction layer.
 *
 * Intent construction lives here, not in the router. Every method on
 * OperationEngine must exist here, even the administrative ones with no
 * cognitive-runtime equivalent yet — they throw a clear "not implemented
 * yet" rather than being absent, so OperationRouter never needs a special
 * case for "this operation can't be routed to runtime."
 */
import { Runtime } from '../index.ts';
import { ObserveIntent, RecallIntent, ForgetIntent, HybridRecallIntent } from '../execution/intent.ts';
import type { OperationEngine } from './engine.ts';
import { assertStorageReady } from '../../storage/guard.ts';
import type {
  AbsorbResult, RecallResult, DeleteResult, AbsorbOptions, RecallOptions,
  UpdateResult, SearchResult, UpdateFields, ManasDBConfig, MemoryChunk,
  TelemetryEvent, ProviderHealthStatus, ForgetManyResult, DedupResult,
  ExpireResult, MigrateResult,
  FilterExpression
} from '../../types/index.ts';

const NOT_YET = (op: string) => new Error(`${op}() not implemented in runtime engine yet.`);

export class RuntimeEngine implements OperationEngine {
  constructor(private readonly _runtime: () => Runtime) {}

  public async absorb(text: string, options?: AbsorbOptions): Promise<AbsorbResult> {
    const runtime = this._runtime();
    assertStorageReady(runtime.storage, 'absorb');
    const intent = new ObserveIntent({ text, options: options as Record<string, unknown> });
    return runtime.executeTransaction('absorb', (ctx) => intent.execute(ctx));
  }

  public async recall(query: string, options?: RecallOptions): Promise<RecallResult[]> {
    const runtime = this._runtime();
    assertStorageReady(runtime.storage, 'recall');
    const opts = (options || {}) as Record<string, unknown>;
    const intent = opts['mode'] === 'hybrid'
      ? new HybridRecallIntent({ query, options: opts })
      : new RecallIntent({ query, options: opts });
    return runtime.executeTransaction('recall', (ctx) => intent.execute(ctx));
  }

  public async reasoningRecall(query: string, options?: RecallOptions): Promise<RecallResult[]> {
    throw NOT_YET('reasoningRecall');
  }

  public async update(id: string, updates: UpdateFields): Promise<UpdateResult> {
    throw NOT_YET('update');
  }

  public async search(query: string, options?: RecallOptions): Promise<SearchResult[]> {
    throw NOT_YET('search');
  }

  public async batchAbsorb(texts: string[], options?: AbsorbOptions): Promise<AbsorbResult[]> {
    throw NOT_YET('batchAbsorb');
  }

  public async forget(id: string): Promise<DeleteResult> {
    const runtime = this._runtime();
    assertStorageReady(runtime.storage, 'forget');
    const intent = new ForgetIntent({ id, options: {} });
    return runtime.executeTransaction('forget', (ctx) => intent.execute(ctx));
  }

  public async exportData(): Promise<unknown> {
    throw NOT_YET('exportData');
  }

  public async importData(data: unknown): Promise<void> {
    throw NOT_YET('importData');
  }

  public async clear(): Promise<void> {
    throw NOT_YET('clear');
  }

  public async migrateTo(targetConfig: ManasDBConfig): Promise<MigrateResult> {
    throw NOT_YET('migrateTo');
  }

  public async getTelemetry(): Promise<TelemetryEvent[]> {
    throw NOT_YET('getTelemetry');
  }

  public async getStats(): Promise<ProviderHealthStatus[]> {
    throw NOT_YET('getStats');
  }

  public async clearTelemetry(): Promise<void> {
    throw NOT_YET('clearTelemetry');
  }

  public async dedup(options?: { minSimilarity?: number }): Promise<DedupResult> {
    throw NOT_YET('dedup');
  }

  public async expireOlderThan(duration: string | Date): Promise<ExpireResult> {
    throw NOT_YET('expireOlderThan');
  }

  public async forgetMany(query: FilterExpression): Promise<ForgetManyResult> {
    throw NOT_YET('forgetMany');
  }

  public async list(limit?: number): Promise<MemoryChunk[]> {
    throw NOT_YET('list');
  }
}
