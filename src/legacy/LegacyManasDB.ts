import MemoryEngine from '../core/memory-engine.ts';
import ModelFactory from '../core/model-factory.ts';
import SearchFormatter from '../utils/SearchFormatter.ts';
import PIIFilter from '../utils/PIIFilter.ts';
import Telemetry from '../utils/Telemetry.ts';
import CostCalculator from '../utils/CostCalculator.ts';
import ModelRegistry from '../utils/ModelRegistry.ts';
import TreeIndex from '../core/tree-index.ts';
import crypto from 'crypto';
import { createProviders, createCacheProvider, inferTypeFromUri } from '../providers/factory.ts';
import type { ManasDBConfig, AbsorbOptions, RecallOptions, PIIShieldConfig, ModelConfig, RetryConfig, UpdateFields } from '../types/index.ts';
import { StorageProvider } from '../storage/providers/StorageProvider.ts';
import type { MemoryRepository } from '../domain/repositories/MemoryRepository.ts';
import { FeatureNotImplementedError } from '../errors/index.ts';
import StorageBaseProvider from '../providers/base.ts';
import AIBaseProvider from '../core/providers/base.provider.ts';

export class LegacyManasDB {
  public projectName?: string;
  public modelConfig: ModelConfig;
  public debug: boolean;
  public retryConfig: RetryConfig;
  public budgetConfig: any;
  public piiShield: PIIShieldConfig;
  public databaseDrivers: StorageBaseProvider[];
  public targetDims?: number;
  public aiProvider?: AIBaseProvider;
  private _traceListeners: Array<(trace: any) => void>;
  private _initCalled: boolean;
  private _dbConfigs: any[];
  private _cacheConfig: any;
  private _cacheProvider: any;
  private _reasoningEnabled: boolean;
  private _treeIndex: TreeIndex;
  private semanticCache: any[];
  private semanticCacheIndex: Map<string, any>;

  constructor({
    uri,
    dbName,
    dbType,
    databases,
    projectName,
    modelConfig,
    piiShield,
    telemetry = true,
    debug = false,
    cache,
    reasoning,
    retry
  }: ManasDBConfig = {}) {
    this.projectName = projectName;
    this.modelConfig = modelConfig || { source: 'transformers' };
    this.debug = debug === true;
    this.retryConfig = retry || { attempts: 1, backoff: 0 };
    this.budgetConfig = retry?.budget || { monthlyLimit: Infinity, currentSpend: 0 };

    this._traceListeners = [];

    Telemetry.enabled = telemetry === true;
    if (telemetry === false) {
      console.warn('[LegacyManasDB] Telemetry disabled. npx manas stats and npx manas ui will show no data. To re-enable: set telemetry: true in config.');
    }

    this.piiShield = { enabled: false, customRules: [] };
    if (piiShield === true) {
      this.piiShield.enabled = true;
    } else if (typeof piiShield === 'object' && piiShield !== null) {
      this.piiShield.enabled = piiShield.enabled !== undefined ? piiShield.enabled : true;
      this.piiShield.customRules = Array.isArray(piiShield.customRules) ? piiShield.customRules : [];
    }

    this.semanticCache = [];
    this.semanticCacheIndex = new Map();

    this.databaseDrivers = [];
    this._initCalled = false;

    let dbConfigs: any[] = databases || [];
    if (!databases || !Array.isArray(databases)) {
      if (uri) {
        let inferType = dbType;
        if (!inferType) {
          inferType = inferTypeFromUri(uri);
        }
        dbConfigs = [{ type: inferType, uri, dbName }];
      } else {
        dbConfigs = [];
      }
    }

    this._dbConfigs = dbConfigs.length > 0 ? dbConfigs : [{ type: 'memory' }];

    if (this.debug && this._dbConfigs[0].type === 'memory') {
      console.log('[LegacyManasDB] No database provided. Booting in zero-config Memory Mode.');
    }

    this._cacheConfig = cache || null;
    this._cacheProvider = null;

    this._reasoningEnabled = reasoning?.enabled === true;
    this._treeIndex = new TreeIndex();
  }

  async update(id: string, updates: UpdateFields): Promise<any> {
    throw new FeatureNotImplementedError('update() is not implemented in Legacy engine. Enable Runtime pipelines.');
  }

  async search(query: string, options?: any): Promise<any> {
    throw new FeatureNotImplementedError('search() is not implemented in Legacy engine. Enable Runtime pipelines.');
  }

  async batchAbsorb(texts: string[], options?: any): Promise<any> {
    
    throw new FeatureNotImplementedError('batchAbsorb() is not implemented in Legacy engine. Enable Runtime pipelines.');
  }

  async export(): Promise<any> {
    
    throw new FeatureNotImplementedError('export() is not implemented in Legacy engine.');
  }

  async import(data: any): Promise<any> {
    
    throw new FeatureNotImplementedError('import() is not implemented in Legacy engine.');
  }

  async close(): Promise<void> {
    await Promise.all(this.databaseDrivers.map(async driver => {
      if (typeof driver.close === 'function') {
        await driver.close();
      } else if (driver.pool && typeof driver.pool.end === 'function') {
        await driver.pool.end();
      }
    }));
    if (this._cacheProvider && typeof this._cacheProvider.close === 'function') {
      await this._cacheProvider.close();
    }
  }

  /**
   * Returns a StorageProvider wrapping the primary established driver.
   * This is the only sanctioned way for the Runtime layer to share the
   * connection — databaseDrivers itself is not part of the external contract.
   *
   * KNOWN, INTENTIONAL GAP (documented in docs/architecture/storage.md,
   * "MemoryRepository — the contract"): `databaseDrivers[0]` is a legacy
   * `BaseProvider` (insert/vectorSearch/keywordSearch), which does NOT
   * structurally satisfy `MemoryRepository` (save/findSimilar/findKeyword) —
   * they're different interfaces with different method names. The cast
   * below is deliberately unsafe and documented as such, not a mistake:
   * every `PipelineStrategy` flag defaults to `'legacy'`, so nothing calls
   * through this `StorageProvider` today (see `assertStorageReady()` in
   * `src/storage/guard.ts`, which would reject this exact object the
   * moment anything tried to route an operation to it). This will need a
   * real translation adapter — not a wider cast — before any operation can
   * safely migrate to `'runtime'` against a legacy-backed driver.
   *
   * Must be called after init().
   */
  public createStorageProvider(): StorageProvider | null {
    if (!this.databaseDrivers || this.databaseDrivers.length === 0) return null;
    return new StorageProvider(this.databaseDrivers[0] as unknown as MemoryRepository);
  }

  async init(): Promise<void> {
    if (!this._initCalled) {
      this.databaseDrivers = await createProviders(this._dbConfigs, this.projectName || 'default', this.debug);
      this._initCalled = true;
    }

    // Local first (matches the pattern already used in absorb()/recall()/
    // reasoningRecall()), then mirrored onto the public field — this keeps
    // every read below fully narrowed to AIBaseProvider (non-optional)
    // instead of re-reading `this.aiProvider`, whose declared type stays
    // `AIBaseProvider | undefined` even immediately after assignment.
    const aiProvider = ModelFactory.getProvider(this.modelConfig);
    this.aiProvider = aiProvider;

    let targetDims = ModelRegistry.getDimensions(this.modelConfig.model || this.modelConfig.source);

    if (!targetDims) {
      if (this.debug) console.log(`[LegacyManasDB] Unknown model dimensions. Performing warm-up embedding to detect...`);
      try {
        const warmup = await aiProvider.embed('warmup');
        targetDims = warmup.vector.length;
        if (this.debug) console.log(`[LegacyManasDB] Detected ${targetDims} dimensions for model: ${this.modelConfig.model || this.modelConfig.source}`);
      } catch (e: any) {
        if (this.debug) console.warn(`[LegacyManasDB] Warm-up failed, falling back to 1536 dims.`, e?.message);
        targetDims = 1536;
      }
    }

    this.targetDims = targetDims || 1536;

    await this._withRetry(async () => {
      await Promise.all(this.databaseDrivers.map(driver => driver.init(this.targetDims)));
    });

    if (this._cacheConfig && !this._cacheProvider) {
      this._cacheProvider = createCacheProvider(this._cacheConfig, this.debug);
      await this._cacheProvider.init();
      if (this.debug) console.log('[LegacyManasDB] Redis Tier 1 cache connected.');
    }

    const primary = this.databaseDrivers[0];
    if (primary && typeof primary.getManifest === 'function') {
      const manifest = await primary.getManifest();
      const currentModelName = this.modelConfig.model || this.modelConfig.source;
      const sample = await aiProvider.embed('verification', this.targetDims);
      const dimensions = sample.vector.length;

      if (manifest) {
        if (manifest.dimensions !== dimensions && !(this.modelConfig as any).allowModelChange) {
          throw new Error(`[LegacyManasDB] Model Mismatch Detected! Current model uses ${dimensions} dims, but stored data uses ${manifest.dimensions} dims. Use 'allowModelChange: true' to override or run 'migrateTo()'.`);
        }
      } else if (typeof primary.updateManifest === 'function') {
        await primary.updateManifest({
          modelName: currentModelName,
          dimensions: dimensions,
          lockedAt: new Date()
        });
      }
    }

    if (this.debug) console.log(`[LegacyManasDB] Initialized with ${this.databaseDrivers.length} providers.`);
  }

  async migrateTo(targetConfig: ManasDBConfig): Promise<{ migratedCount: number }> {
    console.log(`[LegacyManasDB] Starting Migration...`);

    const target = new LegacyManasDB(targetConfig);
    await target.init();

    const primary = this.databaseDrivers[0];
    if (!primary) throw new Error("No source database linked for migration.");

    const db = (primary.uri && primary.uri.startsWith('mongodb')) ? (await import('../core/connection.ts')).default.getDb() : null;
    if (!db) throw new Error("Migration currently only supported from MongoDB source.");

    const docs = await db.collection('_manas_documents').find({ project: this.projectName }).toArray();
    console.log(`[LegacyManasDB] Found ${docs.length} documents to migrate.`);

    for (const doc of docs) {
      const chunks = await db.collection('_manas_chunks').find({ document_id: doc._id }).toArray();
      const combinedText = chunks.map((c: any) => c.text).join(' ');

      await target.absorb(combinedText, {
        projectName: targetConfig.projectName || this.projectName,
        metadata: doc.tags
      });

      if (this.debug) console.log(`  Migrated: ${doc.content_hash.substring(0, 8)}...`);
    }

    console.log(`[LegacyManasDB] Migration complete!`);
    return { migratedCount: docs.length };
  }

  async dedup(options: { minSimilarity?: number } = { minSimilarity: 0.95 }): Promise<{ purgedCount: number }> {
    if (this.debug) console.log(`[LegacyManasDB] Starting semantic deduplication (threshold: ${options.minSimilarity})...`);

    const results = await this.recall('*', { limit: 100 } as any);
    const minSimilarity = options.minSimilarity ?? 0.95;

    const duplicates: any[] = [];

    for (let i = 0; i < results.length; i++) {
      for (let j = i + 1; j < results.length; j++) {
        if (!(results[i] as any).vector || !(results[j] as any).vector) continue;

        const sim = MemoryEngine._cosine((results[i] as any).vector, (results[j] as any).vector);
        if (sim >= minSimilarity) {
          duplicates.push({
            keep: (results[i] as any).document_id,
            remove: (results[j] as any).document_id,
            score: sim
          });
        }
      }
    }

    if (this.debug) console.log(`[LegacyManasDB] Found ${duplicates.length} semantic duplicate pairs.`);

    for (const dup of duplicates) {
      await this.forget(dup.remove);
    }

    return { purgedCount: duplicates.length };
  }

  async _withRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: any;
    const attempts = this.retryConfig?.attempts || 1;
    const backoff = this.retryConfig?.backoff || 0;

    for (let i = 0; i < attempts; i++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err;
        if (i < attempts - 1 && backoff > 0) {
          if (this.debug) console.warn(`[LegacyManasDB] Operation failed. Retrying in ${backoff}ms... (${i + 1}/${attempts})`);
          await new Promise(resolve => setTimeout(resolve, backoff));
        }
      }
    }
    throw lastError;
  }

  async absorb(rawText: string, options: AbsorbOptions & { maxTokens?: number; overlapTokens?: number } = {}): Promise<any> {
    if (!this._initCalled) throw new Error('LegacyManasDB: Call await memory.init() before absorb().');

    const modelUsed = this.modelConfig.model || this.modelConfig.source;
    const tokens = CostCalculator.estimateTokens(rawText);
    const estimatedCost = CostCalculator.calculate(tokens, modelUsed);

    const primaryDriver = this.databaseDrivers[0];
    if (this.budgetConfig.monthlyLimit !== Infinity && primaryDriver) {
      const currentSpend = typeof primaryDriver.getMonthlySpend === 'function' ? await primaryDriver.getMonthlySpend() : 0;
      if (this.debug) console.log(`[LegacyManasDB] Budget Check: Spend=$${currentSpend.toFixed(6)}, Est=$${estimatedCost.toFixed(6)}, Limit=$${this.budgetConfig.monthlyLimit}`);
      if (currentSpend + estimatedCost > this.budgetConfig.monthlyLimit) {
        throw new Error(`[LegacyManasDB] Budget Exceeded! Monthly limit: $${this.budgetConfig.monthlyLimit}. Current spend: $${currentSpend.toFixed(4)}. Ingestion blocked.`);
      }
    }

    if (this.databaseDrivers.length === 0) {
      throw new Error("MANASDB_ERROR: Cannot absorb(). No valid database providers were configured.");
    }
    const timer = Telemetry.startTimer();
    if (typeof rawText !== 'string' || !rawText.trim()) {
      throw new Error('MANASDB_ABSORB_ERROR: Text must be a non-empty string.');
    }

    let text = rawText;
    if (this.piiShield.enabled) {
      text = PIIFilter.redact(rawText, this.piiShield.customRules as any);
    }

    const chunks = MemoryEngine._tokenAwareChunk ?
      MemoryEngine._tokenAwareChunk(text, options.maxTokens ?? 100, options.overlapTokens ?? 20) :
      [{ text: text, embedText: text, sectionTitle: '', chunkIndex: 0, totalInSection: 1 }];

    const extractedTags = MemoryEngine.extractTags(text);
    const parentTags = { ...extractedTags, ...(options.metadata || {}) };
    const aiProvider = ModelFactory.getProvider(this.modelConfig);
    const targetDims = this.targetDims;

    const settlement: PromiseSettledResult<any>[] = await this._withRetry(async () => {
      return await Promise.allSettled(this.databaseDrivers.map(driver =>
        driver.insert({
          rawText,
          filteredText: text,
          chunks: chunks,
          parentTags: parentTags,
          aiProvider,
          targetDims
        })
      ));
    });

    const insertionResults = settlement
      .filter((s): s is PromiseFulfilledResult<any> => s.status === 'fulfilled')
      .map(s => s.value);

    const errors = settlement
      .filter((s): s is PromiseRejectedResult => s.status === 'rejected')
      .map(s => s.reason?.message || String(s.reason));

    if (insertionResults.length === 0 && this.databaseDrivers.length > 0) {
      throw new Error(`MANASDB_INSERT_FAILURE: All database providers failed. Errors: ${errors.join(', ')}`);
    }

    if (errors.length > 0 && this.debug) {
      console.warn(`[LegacyManasDB] Partial insertion failure: ${errors.length} provider(s) failed. Errors: ${errors.join('; ')}`);
    }

    const primaryResult = insertionResults[0] || {};
    const dur = Telemetry.endTimer(timer);

    Telemetry.logEvent('ABSORB_POLYGLOT_COMPLETED', {
      projectName: this.projectName || 'default', durationMs: dur, driversHit: this.databaseDrivers.length,
      tokens, actual_cost: estimatedCost,
      embeddingProfile: 'balanced', chunkSizeUsed: options.maxTokens ?? 100
    }, this.databaseDrivers);

    if (this._reasoningEnabled && chunks.length > 0) {
      if (this.debug) console.log(`[LegacyManasDB] Building reasoning tree index (${chunks.length} chunks)...`);
      this._treeIndex.build(chunks);
    }

    return {
      message: 'Insertion completed.',
      chunks: primaryResult.chunksInserted,
      contentId: primaryResult.contentId || primaryResult.documentId,
      vectorIds: primaryResult.vectorIds,
      isDeduplicated: primaryResult.isDeduplicated,
      inserted: insertionResults,
      rawChunks: chunks,
      costAnalysis: {
        tokens,
        estimatedCostUSD: estimatedCost
      }
    };
  }

  async recall(query: string, options: RecallOptions & { mode?: string; lambda?: number } = {}): Promise<any> {
    if (!this._initCalled) throw new Error('LegacyManasDB: Call await memory.init() before recall().');
    console.error(`[CORE DEBUG] Recall initiated for query: "${query}"`);
    if (this.databaseDrivers.length === 0) {
      throw new Error("MANASDB_ERROR: Cannot recall(). No valid database providers were configured.");
    }
    if (typeof query !== 'string' || !query.trim()) {
      throw new Error('MANASDB_RECALL_ERROR: Query must be a non-empty string.');
    }

    const timer = Telemetry.startTimer();

    const aiProvider = ModelFactory.getProvider(this.modelConfig);
    const targetDims = this.targetDims;

    const modelUsed = this.modelConfig.model || this.modelConfig.source;
    const tokens = CostCalculator.estimateTokens(query);
    const costUSD = CostCalculator.calculate(tokens, modelUsed);

    const primaryDriver = this.databaseDrivers[0];
    if (this.budgetConfig.monthlyLimit !== Infinity && primaryDriver) {
      const currentSpend = typeof primaryDriver.getMonthlySpend === 'function' ? await primaryDriver.getMonthlySpend() : 0;
      if (currentSpend + costUSD > this.budgetConfig.monthlyLimit) {
        throw new Error(`[LegacyManasDB] Budget Exceeded! Recall blocked.`);
      }
    }

    const limit = options.limit ?? 5;
    const minScore = options.minScore ?? 0.05;

    const keywordRetrieval = Promise.all(this.databaseDrivers.map(driver =>
      driver.keywordSearch({
        query,
        limit: limit * 2,
        mode: options.mode || 'qa'
      }).catch((err: any) => {
        if (this.debug) console.warn(`[LegacyManasDB] Keyword search failed: ${err?.message}`);
        return [];
      })
    ));

    const { vector: queryVector } = await aiProvider.embed(query, targetDims);

    const isShortQuery = query.split(/\s+/).length <= 2;
    const queryBucket = isShortQuery ? 'short' : (query.split(/\s+/).length > 10 ? 'long' : 'medium');

    const logCacheTelemetry = (pathStr: string, hit: any) => {
      Telemetry.logEvent('RECALL_POLYGLOT_COMPLETED', {
        projectName: this.projectName || 'default', durationMs: Telemetry.endTimer(timer),
        tokens, actual_cost: 0, savedByCache: costUSD,
        retrievalPath: pathStr, finalScore: hit[0]?.score || hit.score || 0,
        retrievalMode: options.mode || 'qa', queryLengthBucket: queryBucket,
        chunkSizeUsed: limit
      });
    };

    const queryHash = crypto.createHash('sha256').update(query).digest('hex');

    if (!isShortQuery && this.semanticCacheIndex.has(queryHash)) {
      const cached = [...this.semanticCacheIndex.get(queryHash)];
      (cached as any)._trace = { cacheHit: 'memory_exact', tokens, costUSD };
      logCacheTelemetry('lru_tier1', cached);
      return cached;
    }

    if (!isShortQuery) {
      const FUZZY_WINDOW = Math.min(10, this.semanticCache.length);
      for (let i = this.semanticCache.length - 1; i >= this.semanticCache.length - FUZZY_WINDOW; i--) {
        const entry = this.semanticCache[i];
        if (MemoryEngine._cosine(queryVector, entry.queryVector) > 0.95) {
          const cached = [...entry.results];
          (cached as any)._trace = { cacheHit: 'memory', tokens, costUSD };
          logCacheTelemetry('lru_tier1_fuzzy', cached);
          return cached;
        }
      }
    }

    if (!isShortQuery && this._cacheProvider) {
      const redisHit = await this._cacheProvider.getSemanticMatch(queryVector);
      if (redisHit) {
        redisHit._trace = { cacheHit: 'redis', tokens, costUSD };
        logCacheTelemetry('redis_tier2', redisHit);
        return redisHit;
      }
    }

    const lambda = options.lambda !== undefined ? options.lambda : 1.0;
    const includeVector = lambda < 1.0;

    const vectorRetrieval = Promise.all(this.databaseDrivers.map(driver =>
      driver.vectorSearch({
        queryVector,
        limit: limit * 2,
        minScore,
        aiModelName: aiProvider.getModelKey(),
        mode: options.mode || 'qa',
        includeVector
      }).catch((err: any) => {
        if (this.debug) console.warn(`[LegacyManasDB] Vector search failed: ${err?.message}`);
        return [];
      })
    ));

    const [keywordResultsPool, vectorResultsPool] = await Promise.all([
      keywordRetrieval,
      vectorRetrieval
    ]);

    const keywordResults = keywordResultsPool.flat();
    const vectorResults = vectorResultsPool.flat();

    const rrfMap = new Map<string, any>();
    const K = 60;

    const applyRRF = (results: any[], weight: number) => {
      results.forEach((res, index) => {
        const text = res.contentDetails[0]?.text || '';
        if (!text) return;

        if (!rrfMap.has(text)) {
          rrfMap.set(text, { res, rrfScore: 0 });
        }

        const entry = rrfMap.get(text);
        entry.rrfScore += weight * (1 / (K + index + 1));
      });
    };

    applyRRF(vectorResults, 1.0);
    applyRRF(keywordResults, 0.5);

    let mergedPool = Array.from(rrfMap.values())
      .map(item => {
        const normalizedRRF = Math.min(1, item.rrfScore * 10);
        item.res.score = normalizedRRF;
        return item.res;
      })
      .sort((a, b) => b.score - a.score);

    if (lambda < 1.0 && mergedPool.length > 0) {
      mergedPool = this._applyMMR(mergedPool, limit, lambda);
    } else {
      mergedPool = mergedPool.slice(0, limit);
    }

    const finalResults: any = SearchFormatter.formatRecallResults(mergedPool);

    const dur = Telemetry.endTimer(timer);
    Telemetry.logEvent('RECALL_POLYGLOT_COMPLETED', {
      projectName: this.projectName || 'default',
      durationMs: dur,
      tokens,
      actual_cost: costUSD,
      retrievalPath: 'hybrid_parallel',
      finalScore: finalResults[0]?.score || 0,
      retrievalMode: options.mode || 'qa',
      queryLengthBucket: queryBucket,
      chunkSizeUsed: limit
    }, this.databaseDrivers);

    finalResults._trace = {
      query: queryVector,
      nodes: finalResults,
      tokens,
      costUSD,
      durationMs: dur,
      cacheHit: false,
      hybridSources: {
        keyword: keywordResults.length,
        vector: vectorResults.length
      }
    };

    if (!isShortQuery && finalResults.length > 0) {
      this.semanticCacheIndex.set(queryHash, finalResults);
      if (this.semanticCache.length >= 200) {
        const evict = this.semanticCache.shift();
        const evictHash = crypto.createHash('sha256').update(evict.query).digest('hex');
        this.semanticCacheIndex.delete(evictHash);
      }
      this.semanticCache.push({ query, queryVector, results: finalResults });

      if (this._cacheProvider) {
        this._cacheProvider.set(queryVector, finalResults).catch(() => { });
      }
    }

    if (options.mode === 'qa' && this._traceListeners.length > 0) {
      this._emitTrace(finalResults._trace);
    }

    return finalResults;
  }

  estimateAbsorbCost(text: string): { tokens: number; costUSD: number; model: string } {
    const model = this.modelConfig.model || this.modelConfig.source;
    return CostCalculator.estimateAbsorbCost(text, model);
  }

  async expireOlderThan(duration: string | Date): Promise<{ deletedTotal: number }> {
    let date: Date;
    if (duration instanceof Date) {
      date = duration;
    } else {
      const days = parseInt(duration) || 30;
      date = new Date();
      date.setDate(date.getDate() - days);
    }

    const promises = this.databaseDrivers.map(d => typeof d.expireOlderThan === 'function' ? d.expireOlderThan(date) : Promise.resolve(0));
    const results = await Promise.all(promises);
    const totalDeleted = results.reduce((acc, val) => acc + (val || 0), 0);

    if (this.debug) console.log(`[LegacyManasDB] Expired ${totalDeleted} memories older than ${date.toDateString()}.`);
    return { deletedTotal: totalDeleted };
  }

  onTrace(callback: (trace: any) => void): void {
    if (typeof callback === 'function') {
      this._traceListeners.push(callback);
    }
  }

  _emitTrace(trace: any): void {
    this._traceListeners.forEach(listener => listener(trace));
  }

  async reasoningRecall(query: string, options: { topSections?: number; topSection?: number } = {}): Promise<any> {
    if (!this._initCalled) throw new Error('LegacyManasDB: Call await memory.init() before reasoningRecall().');
    if (this.databaseDrivers.length === 0) {
      throw new Error('MANASDB_ERROR: Cannot reasoningRecall(). No valid database providers were configured.');
    }
    if (typeof query !== 'string' || !query.trim()) {
      throw new Error('MANASDB_REASONING_ERROR: Query must be a non-empty string.');
    }
    if (!this._treeIndex.isBuilt) {
      throw new Error('MANASDB_REASONING_ERROR: Tree index is empty. Call absorb() with documents before reasoningRecall().');
    }

    const { topSections = 5, topSection = 0 } = options;
    const aiProvider = ModelFactory.getProvider(this.modelConfig);
    const targetDims = this.targetDims;

    const modelUsed = this.modelConfig.model || this.modelConfig.source;
    const tokens = CostCalculator.estimateTokens(query);
    const estimatedCost = CostCalculator.calculate(tokens, modelUsed);

    const primaryDriver = this.databaseDrivers[0];
    if (this.budgetConfig.monthlyLimit !== Infinity && primaryDriver) {
      const currentSpend = typeof primaryDriver.getMonthlySpend === 'function' ? await primaryDriver.getMonthlySpend() : 0;
      if (currentSpend + estimatedCost > this.budgetConfig.monthlyLimit) {
        throw new Error(`[LegacyManasDB] Budget Exceeded! Monthly limit: $${this.budgetConfig.monthlyLimit}. Current spend: $${currentSpend.toFixed(4)}. Ingestion blocked.`);
      }
    }

    const { vector: queryVector } = await aiProvider.embed(query, targetDims);
    const isShortQuery = query.split(/\s+/).length <= 2;
    const timer = Telemetry.startTimer();
    const queryBucket = isShortQuery ? 'short' : (query.split(/\s+/).length > 10 ? 'long' : 'medium');

    const logCacheTelemetry = (pathStr: string, hit: any) => {
      Telemetry.logEvent('REASONING_RECALL_COMPLETED', {
        projectName: this.projectName || 'default', durationMs: Telemetry.endTimer(timer),
        tokens, actual_cost: 0, savedByCache: estimatedCost,
        retrievalPath: pathStr, finalScore: hit?.score || 0,
        retrievalMode: 'reasoning', queryLengthBucket: queryBucket,
        chunkSizeUsed: topSections
      });
    };

    if (!isShortQuery && this._cacheProvider) {
      const redisHit = await this._cacheProvider.getSemanticMatch(queryVector);
      if (redisHit) {
        redisHit._trace = { cacheHit: 'redis', reasoning: true, tokens, estimatedCost };
        logCacheTelemetry('redis_tier1', redisHit);
        return redisHit;
      }
    }

    const queryHash = crypto.createHash('sha256').update(query).digest('hex');

    if (!isShortQuery && this.semanticCacheIndex.has(queryHash)) {
      const cached = { ...this.semanticCacheIndex.get(queryHash) };
      cached._trace = { cacheHit: 'memory', reasoning: true, tokens, estimatedCost };
      logCacheTelemetry('lru_tier2', cached);
      return cached;
    }

    if (!isShortQuery) {
      const FUZZY_WINDOW = Math.min(10, this.semanticCache.length);
      for (let i = this.semanticCache.length - 1; i >= this.semanticCache.length - FUZZY_WINDOW; i--) {
        const entry = this.semanticCache[i];
        if (MemoryEngine._cosine(queryVector, entry.queryVector) > 0.95) {
          const cached = { ...entry.results };
          cached._trace = { cacheHit: 'memory', reasoning: true, tokens, estimatedCost };
          logCacheTelemetry('lru_tier2_fuzzy', cached);
          return cached;
        }
      }
    }

    await this._treeIndex.vectorize(aiProvider, targetDims || 1536);

    const rankedSections = this._treeIndex.rankSections(queryVector, topSections);
    if (rankedSections.length === 0) {
      return { section: null, score: 0, leaves: [], _trace: { reasoning: true, sectionsFound: 0 } };
    }

    const bestSection = rankedSections[Math.min(topSection, rankedSections.length - 1)];
    let leaves = this._treeIndex.getLeaves(bestSection.sectionId);

    if (this.piiShield.enabled) {
      leaves = leaves.map(leaf => ({
        ...leaf,
        text: PIIFilter.redact(leaf.text, this.piiShield.customRules as any)
      }));
    }

    const dur = Telemetry.endTimer(timer);
    Telemetry.logEvent('REASONING_RECALL_COMPLETED', {
      projectName: this.projectName || 'default', durationMs: dur,
      tokens, actual_cost: estimatedCost,
      retrievalPath: 'tree_reasoning_db', finalScore: bestSection.score,
      retrievalMode: 'reasoning', queryLengthBucket: queryBucket,
      chunkSizeUsed: topSections
    });

    const finalResult = {
      section: bestSection.title,
      score: bestSection.score,
      leaves,
      _trace: {
        reasoning: true,
        sectionsRanked: rankedSections.length,
        selectedSection: bestSection.sectionId,
        cacheHit: false,
        tokens,
        costUSD: estimatedCost
      }
    };

    if (!isShortQuery && leaves.length > 0) {
      this.semanticCacheIndex.set(queryHash, finalResult);
      if (this.semanticCache.length >= 200) {
        const evict = this.semanticCache.shift();
        const evictHash = crypto.createHash('sha256').update(evict.query).digest('hex');
        this.semanticCacheIndex.delete(evictHash);
      }
      this.semanticCache.push({ query, queryVector, results: finalResult });

      if (this._cacheProvider) {
        this._cacheProvider.set(queryVector, finalResult).catch(() => { });
      }
    }

    return finalResult;
  }

  buildReasoningIndex(chunks: any[]): void {
    if (!Array.isArray(chunks) || chunks.length === 0) {
      throw new Error('LegacyManasDB: buildReasoningIndex() requires a non-empty chunks array.');
    }
    this._treeIndex.build(chunks);
    if (this.debug) console.log(`[LegacyManasDB] Reasoning tree built: ${this._treeIndex.sectionCount} sections, ${this._treeIndex.leafCount} leaves.`);
  }

  async delete(documentId: string | number): Promise<void> {
    await Promise.all(this.databaseDrivers.map(driver => driver.delete(documentId)));
  }

  async forget(documentId: string | number): Promise<void> {
    if (this.debug) console.log(`[LegacyManasDB] forget(${documentId}) triggered.`);
    await this.delete(documentId);
  }

  async forgetMany(query: Record<string, any>): Promise<any> {
    if (this.debug) console.log(`[LegacyManasDB] forgetMany(${JSON.stringify(query)}) triggered.`);
    const results = await Promise.all(this.databaseDrivers.map(async driver => {
      let deleted = 0;
      if (typeof driver.deleteMany === 'function') {
        deleted = (await driver.deleteMany(query)) ?? 0;
      }
      return { provider: driver.constructor.name.replace('Provider', '').toLowerCase(), deleted: deleted || 0 };
    }));

    return {
      query,
      deletedTotal: results.reduce((acc, r) => acc + r.deleted, 0),
      providers: results,
      timestamp: new Date().toISOString()
    };
  }

  private _applyMMR(results: any[], limit: number, lambda: number): any[] {
    const ranked: any[] = [];
    const candidates = [...results];

    while (ranked.length < limit && candidates.length > 0) {
      let bestIdx = -1;
      let maxMMR = -Infinity;

      for (let i = 0; i < candidates.length; i++) {
        const cand = candidates[i];
        const relevance = cand.score;

        let maxSimToSelected = 0;
        for (const sel of ranked) {
          const sim = (cand.vector && sel.vector)
            ? MemoryEngine._cosine(cand.vector, sel.vector)
            : 0;

          if (sim > maxSimToSelected) maxSimToSelected = sim;
        }

        const mmrScore = (lambda * relevance) - ((1 - lambda) * maxSimToSelected);
        if (mmrScore > maxMMR) {
          maxMMR = mmrScore;
          bestIdx = i;
        }
      }

      if (bestIdx !== -1) {
        ranked.push(candidates[bestIdx]);
        candidates.splice(bestIdx, 1);
      }
    }
    return ranked;
  }

  async list(limit = 10): Promise<any[]> {
    if (!this._initCalled) throw new Error('LegacyManasDB: Call await memory.init() before list().');
    const results = await Promise.all(this.databaseDrivers.map(driver => driver.list(limit)));
    return results.flat().sort((a: any, b: any) => b.createdAt - a.createdAt).slice(0, limit);
  }

  async clearAll(): Promise<void> {
    if (this.debug) {
      console.warn('[LegacyManasDB] clearAll() triggered. Wiping all vectors, chunks, and documents.');
      console.warn('[LegacyManasDB] _manas_telemetry was NOT cleared.');
    }
    await Promise.all(this.databaseDrivers.map(async driver => {
      if (typeof driver.clear === 'function') {
        await driver.clear();
      }
    }));
    if (this._cacheProvider) {
      await this._cacheProvider.clear();
    }
    this.semanticCache = [];
    this.semanticCacheIndex.clear();
    this._treeIndex.sections?.clear();
    this._treeIndex.leaves?.clear();
  }

  async clearTelemetry(): Promise<void> {
    console.warn('[LegacyManasDB] Clearing telemetry will permanently delete your cost savings history and performance metrics.');
    await Promise.all(this.databaseDrivers.map(async driver => {
      if (typeof driver.clearTelemetry === 'function') {
        await driver.clearTelemetry();
      }
    }));
  }

  /** Read telemetry events stored in _manas_telemetry collection */
  async listTelemetry(limit = 100): Promise<any[]> {
    try {
      const MongoConnection = (await import('../core/connection.ts')).default;
      const { CollectionNames } = await import('../storage/CollectionNames.ts');
      const db = MongoConnection.getDb();
      if (!db) return [];
      return await db.collection(CollectionNames.TELEMETRY)
        .find({})
        .sort({ timestamp: -1 })
        .limit(limit)
        .toArray();
    } catch {
      return [];
    }
  }

  async health(): Promise<any[]> {
    const dbStatuses = await Promise.all(this.databaseDrivers.map(async driver => {
      try {
        const ok = await driver.health();
        return { db: driver.constructor.name, status: ok ? 'OK' : 'FAIL' };
      } catch (error: any) {
        if (this.debug) console.error('Health check error:', error);
        return { db: driver.constructor.name, status: 'FAIL', error: error?.message };
      }
    }));

    if (this._cacheProvider) {
      const cacheOk = await this._cacheProvider.health().catch(() => false);
      dbStatuses.push({ db: 'RedisProvider (Cache)', status: cacheOk ? 'OK' : 'FAIL' });
    }

    return dbStatuses;
  }
}

export default LegacyManasDB;
