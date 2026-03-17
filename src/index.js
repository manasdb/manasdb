// ── Core utilities (always needed, no optional deps) ──────────────────────────
import MemoryEngine from './core/memory-engine.js';
import ModelFactory from './core/model-factory.js';
import SearchFormatter from './utils/SearchFormatter.js';
import PIIFilter from './utils/PIIFilter.js';
import Telemetry from './utils/Telemetry.js';
import CostCalculator from './utils/CostCalculator.js';
import ModelRegistry from './utils/ModelRegistry.js';
import TreeIndex from './core/tree-index.js';
import crypto from 'crypto';

// ── Provider factory (lazy-loads actual DB drivers on demand) ─────────────────
import { createProviders, createCacheProvider, inferTypeFromUri } from './providers/factory.js';

class ManasDB {
  /**
   * Closes the active database connections.
   */
  async close() {
    await Promise.all(this.databaseDrivers.map(async driver => {
       if (typeof driver.close === 'function') {
         await driver.close();
       } else if (driver.pool && typeof driver.pool.end === 'function') {
         await driver.pool.end();
       }
    }));
    // Close Redis cache connection if it was initialized
    if (this._cacheProvider && typeof this._cacheProvider.close === 'function') {
      await this._cacheProvider.close();
    }
  }
  /**
   * Creates a new ManasDB instance supporting Polyglot Persistence.
   *
   * @param {Object} config
   * @param {string}        [config.uri]          - Single database connection string (Quickstart).
   * @param {string}        [config.dbName]       - Database name (for mongo).
   * @param {Array<Object>} [config.databases]    - Array of database configurations for Polyglot memory.
   *                                                Ex: [{ type: 'mongodb', uri: '...', dbName: '...' }, { type: 'postgres', uri: '...' }]
   * @param {string}        [config.dbType]       - Explicit DB type bypass.
   * @param {string}        [config.projectName]  - Project namespace.
   * @param {Object}        [config.modelConfig]  - { source, model } for embedding provider.
   * @param {boolean|Object}[config.piiShield]    - PII Shield config.
   * @param {boolean}       [config.telemetry]    - Telemetry toggle.
   * @param {boolean}       [config.debug]        - Debug logs toggle.
   * @param {Object}        [config.cache]        - Tier 1 cache config: { provider: 'redis', uri: '...', semanticThreshold: 0.92, ttl: 3600 }
   * @param {Object}        [config.reasoning]    - Hierarchical reasoning: { enabled: true }
   * @param {Object}        [config.retry]        - Optional retry config: { attempts: 3, backoff: 1000 }
   */
  constructor({ uri, dbName, dbType, databases, projectName, modelConfig, piiShield, telemetry = true, debug = false, cache, reasoning, retry }) {
    this.projectName = projectName;
    this.modelConfig = modelConfig || { source: 'transformers' };
    this.debug       = debug === true;
    this.retryConfig = retry || { attempts: 1, backoff: 0 };
    this.budgetConfig = retry?.budget || { monthlyLimit: Infinity, currentSpend: 0 }; // retry was likely context, actually retry should be config object sibling

    this._traceListeners = [];
    
    Telemetry.enabled = telemetry === true;
    if (telemetry === false) {
      console.warn('[ManasDB] Telemetry disabled. npx manas stats and npx manas ui will show no data. To re-enable: set telemetry: true in config.');
    }

    // ── Setup PII Shield (Independent of Databases) ──
    this.piiShield = { enabled: false, customRules: [] };
    if (piiShield === true) {
      this.piiShield.enabled = true;
    } else if (typeof piiShield === 'object' && piiShield !== null) {
      this.piiShield.enabled     = piiShield.enabled !== undefined ? piiShield.enabled : true;
      this.piiShield.customRules = Array.isArray(piiShield.customRules) ? piiShield.customRules : [];
    }

    // ── Semantic cache ──
    this.semanticCache      = [];
    this.semanticCacheIndex = new Map();

    // ── Store raw DB config — providers are resolved lazily inside init() ──
    // This avoids loading the 'pg' or 'mongodb' package until actually needed.
    this.databaseDrivers = [];   // populated by init()
    this._initCalled     = false;

    // Backwards-compatible quickstart normalization (single uri → databases[])
    let dbConfigs = databases;
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

    // Persist raw configs; do NOT instantiate providers here
    this._dbConfigs = dbConfigs.length > 0 ? dbConfigs : [{ type: 'memory' }];

    if (this.debug && this._dbConfigs[0].type === 'memory') {
      console.log('[ManasDB] No database provided. Booting in zero-config Memory Mode.');
    }

    // ── Tier 1 Redis Cache (optional) ──
    // Instantiated here but NOT connected until init()
    this._cacheConfig   = cache || null;
    this._cacheProvider = null;   // set in init()

    // ── Hierarchical Reasoning (optional) ──
    this._reasoningEnabled = reasoning?.enabled === true;
    this._treeIndex        = new TreeIndex(); // lazy-built on first reasoningRecall()
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  init()
  // ══════════════════════════════════════════════════════════════════════════

  async init() {
    // ── Lazy-load DB providers via the factory ────────────────────────────────
    // This is the ONLY place where 'mongodb' or 'pg' packages are imported.
    // If a package is missing, createProviders() throws a helpful install message.
    if (!this._initCalled) {
      this.databaseDrivers = await createProviders(this._dbConfigs, this.projectName, this.debug);
      this._initCalled = true;
    }

    const targetDims = ModelRegistry.getDimensions(this.modelConfig.model || this.modelConfig.source) || 1536;
    this.targetDims = targetDims;
    this.aiProvider = ModelFactory.getProvider(this.modelConfig);

    // Init all DB providers concurrently (schema creation, index checks, etc.)
    await this._withRetry(async () => {
      await Promise.all(this.databaseDrivers.map(driver => driver.init(targetDims)));
    });

    // ── Tier 1 Redis Cache init ───────────────────────────────────────────────
    // createCacheProvider() is synchronous — ioredis is lazy-loaded inside RedisProvider.init()
    if (this._cacheConfig && !this._cacheProvider) {
      this._cacheProvider = createCacheProvider(this._cacheConfig, this.debug);
      await this._cacheProvider.init();
      if (this.debug) console.log('[ManasDB] Redis Tier 1 cache connected.');
    }

    // 4. Model Dimension Lock & Validation ─────
    const primary = this.databaseDrivers[0];
    if (primary && typeof primary.getManifest === 'function') {
      const manifest = await primary.getManifest();
      const currentModelName = this.modelConfig.model || this.modelConfig.source;
      const sample = await this.aiProvider.embed('verification', this.targetDims);
      const dimensions = sample.vector.length;

      if (manifest) {
        if (manifest.dimensions !== dimensions && !this.modelConfig.allowModelChange) {
          throw new Error(`[ManasDB] Model Mismatch Detected! Current model uses ${dimensions} dims, but stored data uses ${manifest.dimensions} dims. Use 'allowModelChange: true' to override or run 'migrateTo()'.`);
        }
      } else {
        // Initial setup - lock it in
        await primary.updateManifest({
          modelName: currentModelName,
          dimensions: dimensions,
          lockedAt: new Date()
        });
      }
    }

    if (this.debug) console.log(`[ManasDB] Initialized with ${this.databaseDrivers.length} providers.`);
  }

  /**
   * Data Migration & Switching Path
   * Migrates all data from the current instance to a new target provider.
   * If the model or dimensions differ, it automatically re-embeds the text.
   */
  async migrateTo(targetConfig) {
    console.log(chalk?.cyan ? chalk.cyan(`\n[ManasDB] Starting Migration...`) : `[ManasDB] Starting Migration...`);
    
    // 1. Create target instance
    const target = new ManasDB(targetConfig);
    await target.init();

    const primary = this.databaseDrivers[0];
    if (!primary) throw new Error("No source database linked for migration.");

    // 2. Fetch all unique documents from source
    // Note: This is an expensive operation for very large DBs
    const db = (primary.uri.startsWith('mongodb')) ? (await import('../src/core/connection.js')).default.getDb() : null;
    if (!db) throw new Error("Migration currently only supported from MongoDB source.");

    const docs = await db.collection('_manas_documents').find({ project: this.projectName }).toArray();
    console.log(`[ManasDB] Found ${docs.length} documents to migrate.`);

    for (const doc of docs) {
      // Get all chunks for this doc
      const chunks = await db.collection('_manas_chunks').find({ document_id: doc._id }).toArray();
      const combinedText = chunks.map(c => c.text).join(' ');
      
      // Absorb into target (this will handle re-embedding if target has different model)
      await target.absorb(combinedText, {
         projectName: targetConfig.projectName || this.projectName,
         tags: doc.tags
      });
      
      if (this.debug) console.log(`  Migrated: ${doc.content_hash.substring(0,8)}...`);
    }

    console.log(`[ManasDB] Migration complete!`);
    return { migratedCount: docs.length };
  }

  /**
   * Bulk Semantic Deduplication
   * Identifies near-duplicate memories and consolidates them.
   */
  async dedup(options = { minSimilarity: 0.95 }) {
    if (this.debug) console.log(`[ManasDB] Starting semantic deduplication (threshold: ${options.minSimilarity})...`);
    
    // Force a semantic search with includeVector to find neighbors
    const results = await this.recall('*', { limit: 100, includeVector: true });
    
    const duplicates = [];
    const seenHashes = new Set();

    for (let i = 0; i < results.length; i++) {
      for (let j = i + 1; j < results.length; j++) {
        const score = results[i].score; // this isn't quite right for cross-comparison
        // Actually we need to compare them to each other
        if (!results[i].vector || !results[j].vector) continue;
        
        const sim = MemoryEngine._cosine(results[i].vector, results[j].vector);
        if (sim >= options.minSimilarity) {
          duplicates.push({ 
            keep: results[i].document_id, 
            remove: results[j].document_id,
            score: sim
          });
        }
      }
    }

    if (this.debug) console.log(`[ManasDB] Found ${duplicates.length} semantic duplicate pairs.`);
    
    for (const dup of duplicates) {
        await this.forget(dup.remove);
    }

    return { purgedCount: duplicates.length };
  }

  /**
   * Internal retry helper for database operations.
   */
  async _withRetry(fn) {
    let lastError;
    const attempts = this.retryConfig?.attempts || 1;
    const backoff  = this.retryConfig?.backoff || 0;

    for (let i = 0; i < attempts; i++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err;
        if (i < attempts - 1 && backoff > 0) {
          if (this.debug) console.warn(`[ManasDB] Operation failed. Retrying in ${backoff}ms... (${i + 1}/${attempts})`);
          await new Promise(resolve => setTimeout(resolve, backoff));
        }
      }
    }
    throw lastError;
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  absorb() 
  // ══════════════════════════════════════════════════════════════════════════

  async absorb(rawText, options = {}) {
    if (!this._initCalled) throw new Error('MANASDB: Call await memory.init() before absorb().');
    
    // ── 1. Budget Cap Enforcement (Absolute Pre-Flight) ──
    const modelUsed = this.modelConfig.model || this.modelConfig.source;
    const tokens = CostCalculator.estimateTokens(rawText);
    const estimatedCost = CostCalculator.calculate(tokens, modelUsed);

    const primaryDriver = this.databaseDrivers[0];
    if (this.budgetConfig.monthlyLimit !== Infinity && primaryDriver) {
      const currentSpend = await primaryDriver.getMonthlySpend();
      if (this.debug) console.log(`[ManasDB] Budget Check: Spend=$${currentSpend.toFixed(6)}, Est=$${estimatedCost.toFixed(6)}, Limit=$${this.budgetConfig.monthlyLimit}`);
      if (currentSpend + estimatedCost > this.budgetConfig.monthlyLimit) {
         throw new Error(`[ManasDB] Budget Exceeded! Monthly limit: $${this.budgetConfig.monthlyLimit}. Current spend: $${currentSpend.toFixed(4)}. Ingestion blocked.`);
      }
    }

    if (this.databaseDrivers.length === 0) {
      throw new Error("MANASDB_ERROR: Cannot absorb(). No valid database providers were configured (e.g., missing MongoDB/Postgres URI).");
    }
    const timer = Telemetry.startTimer();
    if (typeof rawText !== 'string' || !rawText.trim()) {
      throw new Error('MANASDB_ABSORB_ERROR: Text must be a non-empty string.');
    }

    // ── 2. PII Shield Execution ──
    let text = rawText;
    if (this.piiShield.enabled) {
      text = PIIFilter.redact(rawText, this.piiShield.customRules);
    }

    // ── 2. Chunking & Tagging Initialization ──
    // Token-aware sliding window chunker
    const chunks = MemoryEngine._tokenAwareChunk ? 
      MemoryEngine._tokenAwareChunk(text, options.maxTokens ?? 100, options.overlapTokens ?? 20) :
      [{ text: text, embedText: text, sectionTitle: '', chunkIndex: 0, totalInSection: 1 }];
      
    const extractedTags = MemoryEngine.extractTags(text);
    const parentTags = { ...extractedTags, ...(options.metadata || {}) };
    const aiProvider = ModelFactory.getProvider(this.modelConfig);
    const targetDims = ModelRegistry.getDimensions(this.modelConfig.model || this.modelConfig.source) || 1536;

    // ── 3. DB Insertion (Concurrent Broadcast) ────
    const settlement = await this._withRetry(async () => {
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
      .filter(s => s.status === 'fulfilled')
      .map(s => s.value);
    
    const errors = settlement
      .filter(s => s.status === 'rejected')
      .map(s => s.reason.message);

    if (insertionResults.length === 0 && this.databaseDrivers.length > 0) {
      throw new Error(`MANASDB_INSERT_FAILURE: All database providers failed. Errors: ${errors.join(', ')}`);
    }

    if (errors.length > 0 && this.debug) {
       console.warn(`[ManasDB] Partial insertion failure: ${errors.length} provider(s) failed. Errors: ${errors.join('; ')}`);
    }

    const primaryResult = insertionResults[0] || {};
    
    // ── 4. Cost Calculation ──
    // (Already calculated in pre-flight)

    const dur = Telemetry.endTimer(timer);
    Telemetry.logEvent('ABSORB_POLYGLOT_COMPLETED', {
      projectName: this.projectName || 'default', durationMs: dur, driversHit: this.databaseDrivers.length,
      tokens, actual_cost: estimatedCost,
      embeddingProfile: 'balanced', chunkSizeUsed: options.maxTokens ?? 100
    }, this.databaseDrivers);

    // ── 5. Hierarchical Reasoning Index (Post-DB) ──
    if (this._reasoningEnabled && chunks.length > 0) {
      if (this.debug) console.log(`[ManasDB] Building reasoning tree index (${chunks.length} chunks)...`);
      this._treeIndex.build(chunks);
    }

    return {
      message: 'Insertion completed.',
      chunks: primaryResult.chunksInserted,
      contentId: primaryResult.contentId,
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

  // ══════════════════════════════════════════════════════════════════════════
  //  recall()
  // ══════════════════════════════════════════════════════════════════════════

  async recall(query, options = {}) {
    if (!this._initCalled) throw new Error('MANASDB: Call await memory.init() before recall().');
    console.error(`[CORE DEBUG] Recall initiated for query: "${query}"`);
    if (this.databaseDrivers.length === 0) {
      throw new Error("MANASDB_ERROR: Cannot recall(). No valid database providers were configured (e.g., missing MongoDB/Postgres URI).");
    }
    if (typeof query !== 'string' || !query.trim()) {
      throw new Error('MANASDB_RECALL_ERROR: Query must be a non-empty string.');
    }

    const timer = Telemetry.startTimer();

    // ── 1. Embed query once ────
    const aiProvider = ModelFactory.getProvider(this.modelConfig);
    const targetDims = ModelRegistry.getDimensions(this.modelConfig.model || this.modelConfig.source) || 1536;

    // Estimate tokens/cost for the Embedding Query execution
    const modelUsed = this.modelConfig.model || this.modelConfig.source;
    const tokens = CostCalculator.estimateTokens(query);
    const costUSD = CostCalculator.calculate(tokens, modelUsed);

    // ── Budget Check for Recall ──
    const primaryDriver = this.databaseDrivers[0];
    if (this.budgetConfig.monthlyLimit !== Infinity && primaryDriver) {
      const currentSpend = await primaryDriver.getMonthlySpend();
      if (currentSpend + costUSD > this.budgetConfig.monthlyLimit) {
        throw new Error(`[ManasDB] Budget Exceeded! Recall blocked.`);
      }
    }

    const limit      = options.limit    ?? 5;
    const minScore   = options.minScore ?? 0.05;

    // ── 1.a Launch Keyword Search immediately (Parallel Path) ────
    const keywordRetrieval = Promise.all(this.databaseDrivers.map(driver => 
      driver.keywordSearch({ 
        query, 
        limit: limit * 2,
        mode: options.mode || 'qa'
      }).catch(err => {
        if (this.debug) console.warn(`[ManasDB] Keyword search failed: ${err.message}`);
        return [];
      })
    ));

    const { vector: queryVector } = await aiProvider.embed(query, targetDims);

    // Short Query Bypass: Ultra-short queries have high collision rates and low DB execution cost.
    // Bypassing the cache avoids the 2-4ms TCP hop overhead to Redis.
    const isShortQuery = query.split(/\s+/).length <= 2;
    const queryBucket = isShortQuery ? 'short' : (query.split(/\s+/).length > 10 ? 'long' : 'medium');

    // Helper for cache telemetry
    const logCacheTelemetry = (path, hit) => {
      Telemetry.logEvent('RECALL_POLYGLOT_COMPLETED', {
        projectName: this.projectName || 'default', durationMs: Telemetry.endTimer(timer),
        tokens, actual_cost: 0, savedByCache: costUSD,
        retrievalPath: path, finalScore: hit[0]?.score || hit.score || 0,
        retrievalMode: options.mode || 'qa', queryLengthBucket: queryBucket,
        chunkSizeUsed: limit
      });
    };

    // ── 1.a Tier 1: Redis Semantic Cache ──────────────────────────────────────
    // Check Redis BEFORE in-memory LRU — Redis is shared across server instances.
    if (!isShortQuery && this._cacheProvider) {
      const redisHit = await this._cacheProvider.getSemanticMatch(queryVector);
      if (redisHit) {
        redisHit._trace = { cacheHit: 'redis', tokens, costUSD };
        logCacheTelemetry('redis_tier1', redisHit);
        return redisHit;
      }
    }

    const queryHash = crypto.createHash('sha256').update(query).digest('hex');

    // ── 1.b Tier 2: In-Memory LRU Cache ──────────────────────────────────────
    if (!isShortQuery && this.semanticCacheIndex.has(queryHash)) {
      const cached = [...this.semanticCacheIndex.get(queryHash)];
      logCacheTelemetry('lru_tier2', cached);
      return cached;
    }

    if (!isShortQuery) {
      const FUZZY_WINDOW = Math.min(10, this.semanticCache.length);
      for (let i = this.semanticCache.length - 1; i >= this.semanticCache.length - FUZZY_WINDOW; i--) {
        const entry = this.semanticCache[i];
        if (MemoryEngine._cosine(queryVector, entry.queryVector) > 0.95) {
          const cached = [...entry.results]; // Clone array
          cached._trace = { cacheHit: 'memory', tokens, costUSD };
          logCacheTelemetry('lru_tier2_fuzzy', cached);
          return cached;
        }
      }
    }

    const lambda     = options.lambda   !== undefined ? options.lambda : 1.0;
    const includeVector = lambda < 1.0;

    // ── 2. Vector Search Retrieval ────
    const vectorRetrieval = Promise.all(this.databaseDrivers.map(driver => 
      driver.vectorSearch({
        queryVector,
        limit: limit * 2,
        minScore,
        aiModelName: aiProvider.getModelKey(),
        mode: options.mode || 'qa',
        includeVector
      }).catch(err => {
        if (this.debug) console.warn(`[ManasDB] Vector search failed: ${err.message}`);
        return [];
      })
    ));

    // Await both streams
    const [keywordResultsPool, vectorResultsPool] = await Promise.all([
      keywordRetrieval,
      vectorRetrieval
    ]);
    
    // Flatten pools
    const keywordResults = keywordResultsPool.flat();
    const vectorResults = vectorResultsPool.flat();

    // ── 3. Reciprocal Rank Fusion (RRF) ────
    const rrfMap = new Map();
    const K = 60; // RRF constant

    const applyRRF = (results, weight) => {
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

    // Vector results usually have higher semantic value
    applyRRF(vectorResults, 1.0);
    // Keyword results are weighted slightly lower but help with exact matches
    applyRRF(keywordResults, 0.5);

    let mergedPool = Array.from(rrfMap.values())
      .map(item => {
        // Adjust score to be compatible with standard normalized scores [0,1]
        // RRF scores are typically small, we'll use a heuristic for visualization
        const normalizedRRF = Math.min(1, item.rrfScore * 10); 
        item.res.score = normalizedRRF;
        return item.res;
      })
      .sort((a, b) => b.score - a.score);

    // ── 4. Final Ranking & Formatting ────
    if (lambda < 1.0 && mergedPool.length > 0) {
      mergedPool = this._applyMMR(mergedPool, limit, lambda);
    } else {
      mergedPool = mergedPool.slice(0, limit);
    }

    const finalResults = SearchFormatter.formatRecallResults(mergedPool);

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

    // Finalize trace object
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

    // ── 5. Cache Storage ────
    if (!isShortQuery && finalResults.length > 0) {
      this.semanticCacheIndex.set(queryHash, finalResults);
      if (this.semanticCache.length >= 200) {
        const evict = this.semanticCache.shift();
        const evictHash = crypto.createHash('sha256').update(evict.query).digest('hex');
        this.semanticCacheIndex.delete(evictHash);
      }
      this.semanticCache.push({ query, queryVector, results: finalResults });

      if (this._cacheProvider) {
        this._cacheProvider.set(queryVector, finalResults).catch(() => {});
      }
    }

    if (options.mode === 'qa' && this._traceListeners.length > 0) {
      this._emitTrace(finalResults._trace);
    }

    return finalResults;
  }

  /**
   * Pre-flight cost estimation for absorb().
   * Helps users budget before committing to a large vector operation.
   */
  estimateAbsorbCost(text) {
    const model = this.modelConfig.model || this.modelConfig.source;
    return CostCalculator.estimateAbsorbCost(text, model);
  }

  /**
   * Bulk expire memories older than a duration (e.g., '30d') or Date object.
   */
  async expireOlderThan(duration) {
    let date;
    if (duration instanceof Date) {
      date = duration;
    } else {
      const days = parseInt(duration) || 30;
      date = new Date();
      date.setDate(date.getDate() - days);
    }

    const promises = this.databaseDrivers.map(d => d.expireOlderThan(date));
    const results = await Promise.all(promises);
    const totalDeleted = results.reduce((acc, val) => acc + (val || 0), 0);
    
    if (this.debug) console.log(`[ManasDB] Expired ${totalDeleted} memories older than ${date.toDateString()}.`);
    return { deletedTotal: totalDeleted };
  }

  /**
   * Programmatic Trace Subscription
   * Allows production monitoring of internal retrieval decisions.
   */
  onTrace(callback) {
    if (typeof callback === 'function') {
      this._traceListeners.push(callback);
    }
  }

  _emitTrace(trace) {
    this._traceListeners.forEach(listener => listener(trace));
  }


  // ══════════════════════════════════════════════════════════════════════════
  //  reasoningRecall() — Hierarchical Tree Reasoning
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Hierarchical tree-based reasoning recall.
   *
   * Instead of flat vector search, this method:
   *   1. Ranks document sections by query similarity.
   *   2. Selects the best section.
   *   3. Returns only the leaf chunks belonging to that section.
   *
   * PII Shield is applied AFTER leaf retrieval and BEFORE returning the response.
   *
   * @param {string} query
   * @param {Object} options
   * @param {number} [options.topSections=5]  - Number of sections to rank.
   * @param {number} [options.topSection=0]   - Index of section to retrieve (0 = best scoring).
   * @returns {Promise<{ section: string, score: number, leaves: Array<{ text: string, chunkIndex: number }> }>}
   */
  async reasoningRecall(query, options = {}) {
    if (!this._initCalled) throw new Error('MANASDB: Call await memory.init() before reasoningRecall().');
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
    const targetDims = ModelRegistry.getDimensions(this.modelConfig.model || this.modelConfig.source) || 1536;

    const modelUsed = this.modelConfig.model || this.modelConfig.source;
    const tokens = CostCalculator.estimateTokens(query);
    const estimatedCost = CostCalculator.calculate(tokens, modelUsed);

    // ── 1b. Budget Cap Enforcement (Pre-Flight) ──
    const primaryDriver = this.databaseDrivers[0];
    if (this.budgetConfig.monthlyLimit !== Infinity && primaryDriver) {
      const currentSpend = await primaryDriver.getMonthlySpend();
      if (currentSpend + estimatedCost > this.budgetConfig.monthlyLimit) {
        throw new Error(`[ManasDB] Budget Exceeded! Monthly limit: $${this.budgetConfig.monthlyLimit}. Current spend: $${currentSpend.toFixed(4)}. Ingestion blocked.`);
      }
    }

    const estimatedSavings = CostCalculator.estimateSavings(tokens, modelUsed);

    // ── Step 1: Embed query ──
    const { vector: queryVector } = await aiProvider.embed(query, targetDims);

    const isShortQuery = query.split(/\s+/).length <= 2;

    const timer = Telemetry.startTimer();
    const queryBucket = isShortQuery ? 'short' : (query.split(/\s+/).length > 10 ? 'long' : 'medium');

    const logCacheTelemetry = (path, hit) => {
      Telemetry.logEvent('REASONING_RECALL_COMPLETED', {
        projectName: this.projectName || 'default', durationMs: Telemetry.endTimer(timer),
        tokens, actual_cost: 0, savedByCache: costUSD,
        retrievalPath: path, finalScore: hit?.score || 0,
        retrievalMode: 'reasoning', queryLengthBucket: queryBucket,
        chunkSizeUsed: topSections
      });
    };

    // ── Tier 1: Redis Semantic Cache ──
    if (!isShortQuery && this._cacheProvider) {
      const redisHit = await this._cacheProvider.getSemanticMatch(queryVector);
      if (redisHit) {
        redisHit._trace = { cacheHit: 'redis', reasoning: true, tokens, costUSD };
        logCacheTelemetry('redis_tier1', redisHit);
        return redisHit;
      }
    }

    const queryHash = crypto.createHash('sha256').update(query).digest('hex');

    // ── Tier 2: In-Memory Cache ──
    if (!isShortQuery && this.semanticCacheIndex.has(queryHash)) {
      const cached = { ...this.semanticCacheIndex.get(queryHash) };
      cached._trace = { cacheHit: 'memory', reasoning: true, tokens, costUSD };
      logCacheTelemetry('lru_tier2', cached);
      return cached;
    }

    if (!isShortQuery) {
      const FUZZY_WINDOW = Math.min(10, this.semanticCache.length);
      for (let i = this.semanticCache.length - 1; i >= this.semanticCache.length - FUZZY_WINDOW; i--) {
        const entry = this.semanticCache[i];
        if (MemoryEngine._cosine(queryVector, entry.queryVector) > 0.95) {
          const cached = { ...entry.results };
          cached._trace = { cacheHit: 'memory', reasoning: true, tokens, costUSD };
          logCacheTelemetry('lru_tier2_fuzzy', cached);
          return cached;
        }
      }
    }

    // ── Step 2: Ensure section vectors are built (lazy on first call) ──
    await this._treeIndex.vectorize(aiProvider, targetDims);

    // ── Step 3: Rank sections by cosine similarity ──
    const rankedSections = this._treeIndex.rankSections(queryVector, topSections);
    if (rankedSections.length === 0) {
      return { section: null, score: 0, leaves: [], _trace: { reasoning: true, sectionsFound: 0 } };
    }

    // ── Step 4: Select best section (index configurable) ──
    const bestSection = rankedSections[Math.min(topSection, rankedSections.length - 1)];

    // ── Step 5: Retrieve leaf nodes for best section ──
    let leaves = this._treeIndex.getLeaves(bestSection.sectionId);

    // ── Step 6: Apply PII Shield AFTER retrieval, BEFORE response (Production Guard) ──
    if (this.piiShield.enabled) {
      leaves = leaves.map(leaf => ({
        ...leaf,
        text: PIIFilter.redact(leaf.text, this.piiShield.customRules)
      }));
    }

    // ── Step 7: Cost Calculation ──
    const dur = Telemetry.endTimer(timer);
    Telemetry.logEvent('REASONING_RECALL_COMPLETED', {
      projectName: this.projectName || 'default', durationMs: dur,
      tokens, actual_cost: costUSD,
      retrievalPath: 'tree_reasoning_db', finalScore: bestSection.score,
      retrievalMode: 'reasoning', queryLengthBucket: queryBucket,
      chunkSizeUsed: topSections
    });

    const finalResult = {
      section:  bestSection.title,
      score:    bestSection.score,
      leaves,
      _trace: {
        reasoning:      true,
        sectionsRanked: rankedSections.length,
        selectedSection: bestSection.sectionId,
        cacheHit:       false,
        tokens,
        costUSD
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
        this._cacheProvider.set(queryVector, finalResult).catch(() => {});
      }
    }

    return finalResult;
  }

  /**
   * Populates the internal TreeIndex from raw chunks.
   * Call this after absorb() if you intend to use reasoningRecall().
   *
   * @param {Array<{ text: string, sectionTitle?: string, chunkIndex: number }>} chunks
   */
  buildReasoningIndex(chunks) {
    if (!Array.isArray(chunks) || chunks.length === 0) {
      throw new Error('MANASDB: buildReasoningIndex() requires a non-empty chunks array.');
    }
    this._treeIndex.build(chunks);
    if (this.debug) console.log(`[ManasDB] Reasoning tree built: ${this._treeIndex.sectionCount} sections, ${this._treeIndex.leafCount} leaves.`);
  }

  async delete(documentId) {
    await Promise.all(this.databaseDrivers.map(driver => driver.delete(documentId)));
  }

  async forget(documentId) {
    if (this.debug) console.log(`[ManasDB] forget(${documentId}) triggered.`);
    await this.delete(documentId);
  }

  async forgetMany(query) {
    if (this.debug) console.log(`[ManasDB] forgetMany(${JSON.stringify(query)}) triggered.`);
    const results = await Promise.all(this.databaseDrivers.map(async driver => {
      let deleted = 0;
      if (typeof driver.deleteMany === 'function') {
        deleted = await driver.deleteMany(query);
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

  _applyMMR(results, limit, lambda) {
    const ranked = [];
    const candidates = [...results];

    while (ranked.length < limit && candidates.length > 0) {
      let bestIdx = -1;
      let maxMMR = -Infinity;

      for (let i = 0; i < candidates.length; i++) {
        const cand = candidates[i];
        const relevance = cand.score; // Sim(Q, D)

        let maxSimToSelected = 0;
        for (const sel of ranked) {
          // If vectors are missing for some reason, default to 0 similarity to avoid crash
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

  async list(limit = 10) {
    if (!this._initCalled) throw new Error('MANASDB: Call await memory.init() before list().');
    const results = await Promise.all(this.databaseDrivers.map(driver => driver.list(limit)));
    // Flatten and de-duplicate if necessary (simple flatten for now)
    return results.flat().sort((a, b) => b.createdAt - a.createdAt).slice(0, limit);
  }

  async clearAll() {
    if (this.debug) {
      console.warn('[ManasDB] clearAll() triggered. Wiping all vectors, chunks, and documents.');
      console.warn('[ManasDB] _manas_telemetry was NOT cleared. This collection stores your ROI metrics and cost history. To clear it explicitly: await memory.clearTelemetry()');
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

  async clearTelemetry() {
    console.warn('[ManasDB] Clearing telemetry will permanently delete your cost savings history and performance metrics. This cannot be undone.');
    await Promise.all(this.databaseDrivers.map(async driver => {
      if (typeof driver.clearTelemetry === 'function') {
        await driver.clearTelemetry();
      }
    }));
  }

  async health() {
    const dbStatuses = await Promise.all(this.databaseDrivers.map(async driver => {
       try {
         const ok = await driver.health();
         return { db: driver.constructor.name, status: ok ? 'OK' : 'FAIL' };
       } catch (error) {
         if (this.debug) console.error('Health check error:', error);
         return { db: driver.constructor.name, status: 'FAIL', error: error.message };
       }
    }));

    // Include Redis Tier 1 cache health
    if (this._cacheProvider) {
      const cacheOk = await this._cacheProvider.health().catch(() => false);
      dbStatuses.push({ db: 'RedisProvider (Cache)', status: cacheOk ? 'OK' : 'FAIL' });
    }

    return dbStatuses;
  }
}

export { ManasDB };
export default ManasDB;
