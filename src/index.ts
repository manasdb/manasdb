import { OperationRouter } from './runtime/compatibility/index.ts';
import { LegacyEngine } from './runtime/compatibility/legacy-engine.ts';
import { RuntimeEngine } from './runtime/compatibility/runtime-engine.ts';
import { LegacyManasDB } from './legacy/LegacyManasDB.ts';
import { CognitiveAPI } from './namespaces/cognitive.ts';
import { SystemAPI } from './namespaces/system.ts';
import { RuntimeBuilder } from './runtime/builder.ts';
import { Runtime } from './runtime/index.ts';
import { RuntimeNotInitializedError } from './errors/index.ts';
import type {
  ManasDBConfig,
  AbsorbOptions,
  AbsorbResult,
  RecallOptions,
  RecallResult,
  UpdateResult,
  UpdateFields,
  DeleteResult,
  SearchResult,
  MemoryChunk,
  TelemetryEvent,
  ProviderHealthStatus,
  ForgetManyResult,
  DedupResult,
  ExpireResult,
  MigrateResult,
  FilterExpression
} from './types/index.ts';

export class ManasDB {
  public readonly cognitive: CognitiveAPI;
  public readonly system: SystemAPI;

  private readonly _legacy: LegacyManasDB;
  private readonly _router: OperationRouter;

  // null until init() completes — accessed only through _rt()
  private _runtime: Runtime | null = null;

  constructor(config: ManasDBConfig = {}) {
    this._legacy = new LegacyManasDB(config);

    // Adapters wrap each engine behind the LegacyEngine/RuntimeEngine interfaces.
    // OperationRouter only sees those interfaces — no direct coupling to implementations.
    const legacyEngine = new LegacyEngine(this._legacy);
    const runtimeEngine = new RuntimeEngine(() => this._rt());
    this._router = new OperationRouter(legacyEngine, runtimeEngine);

    this.cognitive = new CognitiveAPI(this._router);
    this.system = new SystemAPI(this._router);
  }

  /** Returns the runtime or throws if init() has not been called */
  private _rt(): Runtime {
    if (!this._runtime) {
      throw new RuntimeNotInitializedError(
        'ManasDB.init() must be called before using cognitive operations.'
      );
    }
    return this._runtime;
  }

  // ------------------------------------------
  // Legacy Property Getters (100% compat)
  // ------------------------------------------
  public get databaseDrivers() { return this._legacy.databaseDrivers; }
  public get projectName() { return this._legacy.projectName; }
  public get modelConfig() { return this._legacy.modelConfig; }
  public get debug() { return this._legacy.debug; }
  public get piiShieldConfig() { return this._legacy.piiShield; }

  // ==========================================
  // Tier 1: Core API (Frozen)
  // ==========================================

  public async init(): Promise<void> {
    // 1. Boot the legacy engine (populates databaseDrivers)
    await this._legacy.init();

    // 2. Build the immutable Runtime in one expression — RuntimeBuilder has
    // no reason to live past this method, so it isn't stored on `this`.
    const sharedProvider = this._legacy.createStorageProvider();
    const runtimeBuilder = new RuntimeBuilder().withDebug(this._legacy.debug);
    if (sharedProvider) runtimeBuilder.withStorageProvider(sharedProvider);
    this._runtime = runtimeBuilder.build();

    // 3. Start the runtime lifecycle
    await this._runtime.start();
  }

  public async absorb(text: string, options: AbsorbOptions = {}): Promise<AbsorbResult> {
    return this._router.absorb(text, options);
  }

  public async recall(query: string, options: RecallOptions = {}): Promise<RecallResult[]> {
    return this._router.recall(query, options);
  }

  public async reasoningRecall(query: string, options: RecallOptions = {}): Promise<RecallResult[]> {
    return this._router.reasoningRecall(query, options);
  }

  public async update(id: string, updates: UpdateFields): Promise<UpdateResult> {
    return this._router.update(id, updates);
  }

  public async delete(id: string): Promise<DeleteResult> {
    return this._router.forget(id);
  }

  /** Alias for delete */
  public async forget(id: string): Promise<DeleteResult> {
    return this._router.forget(id);
  }

  public async search(query: string, options?: RecallOptions): Promise<SearchResult[]> {
    return this._router.search(query, options);
  }

  public async batchAbsorb(texts: string[], options?: AbsorbOptions): Promise<AbsorbResult[]> {
    return this._router.batchAbsorb(texts, options);
  }

  public async export(): Promise<unknown> {
    return this._router.exportData();
  }

  public async import(data: unknown): Promise<void> {
    return this._router.importData(data);
  }

  // ==========================================
  // Tier 2: Administration API (Frozen)
  // ==========================================

  /** Wipes all memory for this project */
  public async clear(): Promise<void> {
    return this._router.clear();
  }

  /** Alias for clear */
  public async clearAll(): Promise<void> {
    return this._router.clear();
  }

  /** Migrate all memory to a new database config */
  public async migrateTo(targetConfig: ManasDBConfig): Promise<MigrateResult> {
    return this._router.migrateTo(targetConfig);
  }

  /** Returns stored telemetry events */
  public async getTelemetry(): Promise<TelemetryEvent[]> {
    return this._router.getTelemetry();
  }

  /** Returns health/connection status of all providers */
  public async getStats(): Promise<ProviderHealthStatus[]> {
    return this._router.getStats();
  }

  /** Clear the telemetry history (irreversible) */
  public async clearTelemetry(): Promise<void> {
    return this._router.clearTelemetry();
  }

  /** Remove duplicate memory chunks above a similarity threshold */
  public async dedup(options?: { minSimilarity?: number }): Promise<DedupResult> {
    return this._router.dedup(options);
  }

  /** Delete memory chunks older than a given duration or date */
  public async expireOlderThan(duration: string | Date): Promise<ExpireResult> {
    return this._router.expireOlderThan(duration);
  }

  /** Delete many chunks matching a metadata query */
  public async forgetMany(query: FilterExpression): Promise<ForgetManyResult> {
    return this._router.forgetMany(query);
  }

  /** List recent memory documents */
  public async list(limit?: number): Promise<MemoryChunk[]> {
    return this._router.list(limit);
  }

  public async close(): Promise<void> {
    if (this._runtime) await this._runtime.shutdown();
    return this._legacy.close();
  }
}

export default ManasDB;