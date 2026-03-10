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
   */
  constructor({ uri, dbName, dbType, databases, projectName, modelConfig, piiShield, telemetry = true, debug = false, cache, reasoning }) {
    this.projectName = projectName;
    this.modelConfig = modelConfig || { source: 'transformers' };
    this.debug       = debug === true;

    Telemetry.enabled = telemetry === true;

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
    this._dbConfigs = dbConfigs;

    if (dbConfigs.length === 0) {
      console.warn('MANASDB_WARNING: Initialized with no database providers configured.');
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

    // Init all DB providers concurrently (schema creation, index checks, etc.)
    await Promise.all(this.databaseDrivers.map(driver => driver.init(targetDims)));

    // ── Tier 1 Redis Cache init ───────────────────────────────────────────────
    // createCacheProvider() is synchronous — ioredis is lazy-loaded inside RedisProvider.init()
    if (this._cacheConfig && !this._cacheProvider) {
      this._cacheProvider = createCacheProvider(this._cacheConfig, this.debug);
      await this._cacheProvider.init();
      if (this.debug) console.log('[ManasDB] Redis Tier 1 cache connected.');
    }

    if (this.debug) console.log(`ManasDB Polyglot initialized: ${this.databaseDrivers.length} provider(s) ready.`);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  absorb() 
  // ══════════════════════════════════════════════════════════════════════════

  async absorb(rawText, options = {}) {
    if (!this._initCalled) throw new Error('MANASDB: Call await memory.init() before absorb().');
    if (this.databaseDrivers.length === 0) {
      throw new Error("MANASDB_ERROR: Cannot absorb(). No valid database providers were configured (e.g., missing MongoDB/Postgres URI).");
    }
    const timer = Telemetry.startTimer();
    if (typeof rawText !== 'string' || !rawText.trim()) {
      throw new Error('MANASDB_ABSORB_ERROR: Text must be a non-empty string.');
    }

    // ── 1. PII Shield Execution (Pre-DB) ──
    let text = rawText;
    if (this.piiShield.enabled) {
      text = PIIFilter.redact(rawText, this.piiShield.customRules);
    }

    // ── 2. Chunking & Tagging Initialization ──
    // Token-aware sliding window chunker
    const chunks = MemoryEngine._tokenAwareChunk ? 
      MemoryEngine._tokenAwareChunk(text, options.maxTokens ?? 100, options.overlapTokens ?? 20) :
      [{ text: text, embedText: text, sectionTitle: '', chunkIndex: 0, totalInSection: 1 }];
      
    const parentTags = MemoryEngine.extractTags(text);
    const aiProvider = ModelFactory.getProvider(this.modelConfig);
    const targetDims = ModelRegistry.getDimensions(this.modelConfig.model || this.modelConfig.source) || 1536;

    // ── 3. DB Agnostic Payload Broadcast ──
    // Dispatch exactly the same pre-computed metadata towards every active DB provider currently loaded securely.
    const promises = this.databaseDrivers.map(driver => 
      driver.insert({
        rawText,
        filteredText: text,
        chunks,
        parentTags,
        aiProvider,
        targetDims
      })
    );

    const insertionResults = await Promise.all(promises);

    const dur = Telemetry.endTimer(timer);
    Telemetry.logEvent('ABSORB_POLYGLOT_COMPLETED', {
      projectName: this.projectName || 'default', durationMs: dur, driversHit: this.databaseDrivers.length
    }, this.databaseDrivers);

    const primary = insertionResults[0] || {};
    
    // ── 4. Cost Calculation ──
    const modelUsed = this.modelConfig.model || this.modelConfig.source;
    const tokens = CostCalculator.estimateTokens(text);
    const estimatedCost = CostCalculator.calculate(tokens, modelUsed);

    return {
      message: 'Insertion completed.',
      chunks: primary.chunksInserted,
      contentId: primary.contentId,
      vectorIds: primary.vectorIds,
      isDeduplicated: primary.isDeduplicated,
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

    const { vector: queryVector } = await aiProvider.embed(query, targetDims);

    // Short Query Bypass: Ultra-short queries have high collision rates and low DB execution cost.
    // Bypassing the cache avoids the 2-4ms TCP hop overhead to Redis.
    const isShortQuery = query.split(/\s+/).length <= 2;

    // ── 1.a Tier 1: Redis Semantic Cache ──────────────────────────────────────
    // Check Redis BEFORE in-memory LRU — Redis is shared across server instances.
    if (!isShortQuery && this._cacheProvider) {
      const redisHit = await this._cacheProvider.getSemanticMatch(queryVector);
      if (redisHit) {
        redisHit._trace = { cacheHit: 'redis', tokens, costUSD };
        return redisHit;
      }
    }

    const queryHash = crypto.createHash('sha256').update(query).digest('hex');

    // ── 1.b Tier 2: In-Memory LRU Cache ──────────────────────────────────────
    if (!isShortQuery && this.semanticCacheIndex.has(queryHash)) {
      const cached = [...this.semanticCacheIndex.get(queryHash)]; // Clone array
      cached._trace = { cacheHit: 'memory', tokens, costUSD };
      return cached;
    }

    if (!isShortQuery) {
      const FUZZY_WINDOW = Math.min(10, this.semanticCache.length);
      for (let i = this.semanticCache.length - 1; i >= this.semanticCache.length - FUZZY_WINDOW; i--) {
        const entry = this.semanticCache[i];
        if (MemoryEngine._cosine(queryVector, entry.queryVector) > 0.95) {
          const cached = [...entry.results]; // Clone array
          cached._trace = { cacheHit: 'memory', tokens, costUSD };
          return cached;
        }
      }
    }

    const limit      = options.limit    ?? 5;
    const minScore   = options.minScore ?? 0.05;
    
    // ── 2. Vector Search Broadcast ────
    const promises = this.databaseDrivers.map(driver => 
      driver.vectorSearch({
        queryVector,
        limit: limit * 2, // Grab extras from each provider for deduplication
        minScore,
        aiModelName: aiProvider.getModelKey(),
        mode: options.mode || 'qa'
      })
    );

    const aggregatedResults = await Promise.all(promises);
    
    // Flatten all responses into a single pool
    const flattenedRaw = aggregatedResults.flat();

    // ── 3. Merge and Normalize ────
    // De-duplicate results across different databases hitting the identical chunk exact texts internally.
    // All provider scores MUST be in [0,1] (each provider normalizes before returning).
    // As a final defense clamp here too, so custom drivers can't break polyglot sort ordering.
    const clamp01 = v => Math.max(0, Math.min(1, typeof v === 'number' && !isNaN(v) ? v : 0));
    const uniquePool = new Map();
    for (const res of flattenedRaw) {
      const textHash = res.contentDetails[0]?.text || '';
      const safeScore = clamp01(res.score);
      // We prioritize exact text segments avoiding duplicating answers sent towards LLMs
      if (!uniquePool.has(textHash) || uniquePool.get(textHash).score < safeScore) {
        uniquePool.set(textHash, { ...res, score: safeScore });
      }
    }

    let finalRanked = Array.from(uniquePool.values());
    finalRanked.sort((a, b) => b.score - a.score);
    finalRanked = finalRanked.slice(0, limit);

    // Apply standard SearchFormatter to normalize polyglot outputs
    const finalResults = SearchFormatter.formatRecallResults(finalRanked);

    const dur = Telemetry.endTimer(timer);
    Telemetry.logEvent('RECALL_POLYGLOT_COMPLETED', {
      projectName: this.projectName || 'default', durationMs: dur
    }, this.databaseDrivers);

    // Cost Calculation
    finalResults._trace = { cacheHit: false, rrfMerged: false, tokens, costUSD };

    // ── In-Memory LRU cache storage (LFU/LRU bounded, Tier 2) ──
    if (!isShortQuery && finalResults.length > 0) {
      this.semanticCacheIndex.set(queryHash, finalResults);
      if (this.semanticCache.length >= 200) {
        const evict = this.semanticCache.shift();
        const evictHash = crypto.createHash('sha256').update(evict.query).digest('hex');
        this.semanticCacheIndex.delete(evictHash);
      }
      this.semanticCache.push({ query, queryVector, results: finalResults });

      // ── Warm Redis Tier 1 cache with result ──
      // Fire-and-forget: cache errors never block the response
      if (this._cacheProvider) {
        this._cacheProvider.set(queryVector, finalResults).catch(() => {});
      }
    }

    return finalResults;
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
    const costUSD = CostCalculator.calculate(tokens, modelUsed);

    // ── Step 1: Embed query ──
    const { vector: queryVector } = await aiProvider.embed(query, targetDims);

    const isShortQuery = query.split(/\s+/).length <= 2;

    // ── Tier 1: Redis Semantic Cache ──
    if (!isShortQuery && this._cacheProvider) {
      const redisHit = await this._cacheProvider.getSemanticMatch(queryVector);
      if (redisHit) {
        redisHit._trace = { cacheHit: 'redis', reasoning: true, tokens, costUSD };
        return redisHit;
      }
    }

    const queryHash = crypto.createHash('sha256').update(query).digest('hex');

    // ── Tier 2: In-Memory Cache ──
    if (!isShortQuery && this.semanticCacheIndex.has(queryHash)) {
      const cached = { ...this.semanticCacheIndex.get(queryHash) };
      cached._trace = { cacheHit: 'memory', reasoning: true, tokens, costUSD };
      return cached;
    }

    if (!isShortQuery) {
      const FUZZY_WINDOW = Math.min(10, this.semanticCache.length);
      for (let i = this.semanticCache.length - 1; i >= this.semanticCache.length - FUZZY_WINDOW; i--) {
        const entry = this.semanticCache[i];
        if (MemoryEngine._cosine(queryVector, entry.queryVector) > 0.95) {
          const cached = { ...entry.results };
          cached._trace = { cacheHit: 'memory', reasoning: true, tokens, costUSD };
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
