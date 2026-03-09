// ── Core utilities (always needed, no optional deps) ──────────────────────────
import MemoryEngine from './core/memory-engine.js';
import ModelFactory from './core/model-factory.js';
import SearchFormatter from './utils/SearchFormatter.js';
import PIIFilter from './utils/PIIFilter.js';
import Telemetry from './utils/Telemetry.js';
import CostCalculator from './utils/CostCalculator.js';
import ModelRegistry from './utils/ModelRegistry.js';
import crypto from 'crypto';

// ── Provider factory (lazy-loads actual DB drivers on demand) ─────────────────
import { createProviders, inferTypeFromUri } from './providers/factory.js';

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
   */
  constructor({ uri, dbName, dbType, databases, projectName, modelConfig, piiShield, telemetry = true, debug = false }) {
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
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  init()
  // ══════════════════════════════════════════════════════════════════════════

  async init() {
    // ── Lazy-load providers via the factory ──────────────────────────────────
    // This is the ONLY place where 'mongodb' or 'pg' packages are imported.
    // If a package is missing, createProviders() throws a helpful install message.
    if (!this._initCalled) {
      this.databaseDrivers = await createProviders(this._dbConfigs, this.projectName, this.debug);
      this._initCalled = true;
    }

    const targetDims = ModelRegistry.getDimensions(this.modelConfig.model || this.modelConfig.source) || 1536;

    // Init all providers concurrently (schema creation, index checks, etc.)
    await Promise.all(this.databaseDrivers.map(driver => driver.init(targetDims)));
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
    return {
      message: 'Insertion completed.',
      chunks: primary.chunksInserted,
      contentId: primary.contentId,
      vectorIds: primary.vectorIds,
      isDeduplicated: primary.isDeduplicated,
      inserted: insertionResults 
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
    const { vector: queryVector } = await aiProvider.embed(query, targetDims);

    const queryHash = crypto.createHash('sha256').update(query).digest('hex');

    // ── 1.b Semantic Cosine Cache Check ──
    if (this.semanticCacheIndex.has(queryHash)) {
      const cached = this.semanticCacheIndex.get(queryHash);
      cached._trace = { cacheHit: true };
      return cached;
    }

    const FUZZY_WINDOW = Math.min(10, this.semanticCache.length);
    for (let i = this.semanticCache.length - 1; i >= this.semanticCache.length - FUZZY_WINDOW; i--) {
      const entry = this.semanticCache[i];
      if (MemoryEngine._cosine(queryVector, entry.queryVector) > 0.95) {
        return entry.results;
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
        aiModelName: aiProvider.getModelKey()
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

    const finalResults = finalRanked.map(res => ({
      database: res.database,
      contentId: res.document_id,
      text: res.contentDetails[0]?.text || '',
      tags: res.contentDetails[0]?.tags || [],
      score: res.score,
      metadata: {
        matchedChunk: res.contentDetails[0]?.text || '',
        sectionTitle: res.contentDetails[0]?.sectionTitle || '',
        healedContext: true
      }
    }));

    const dur = Telemetry.endTimer(timer);
    Telemetry.logEvent('RECALL_POLYGLOT_COMPLETED', {
      projectName: this.projectName || 'default', durationMs: dur
    }, this.databaseDrivers);

    finalResults._trace = { cacheHit: false, rrfMerged: false };

    // ── Semantic caching of results (LFU/LRU bounded) ──
    if (finalResults.length > 0) {
      this.semanticCacheIndex.set(queryHash, finalResults);
      if (this.semanticCache.length >= 200) {
        const evict = this.semanticCache.shift();
        const evictHash = crypto.createHash('sha256').update(evict.query).digest('hex');
        this.semanticCacheIndex.delete(evictHash);
      }
      this.semanticCache.push({ query, queryVector, results: finalResults });
    }

    return finalResults;
  }

  async delete(documentId) {
    await Promise.all(this.databaseDrivers.map(driver => driver.delete(documentId)));
  }

  async health() {
    const statuses = await Promise.all(this.databaseDrivers.map(async driver => {
       try {
         const ok = await driver.health();
         return { db: driver.constructor.name, status: ok ? 'OK' : 'FAIL' };
       } catch (error) {
      if (this.debug) console.error("Polyglot Absorb Error:", error);
      throw error;
    }   }
    ));
    return statuses;
  }
}

export { ManasDB };
export default ManasDB;
