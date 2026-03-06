import MongoConnection from './core/connection.js';
import MemoryEngine from './core/memory-engine.js';
import ModelFactory from './core/model-factory.js';
import SearchFormatter from './utils/SearchFormatter.js';
import PIIFilter from './utils/PIIFilter.js';
import Telemetry from './utils/Telemetry.js';
import CostCalculator from './utils/CostCalculator.js';
import crypto from 'crypto';

// ─────────────────────────────────────────────────────────────────────────────
// ManasDB  ·  Elite RAG Engine
//
// Architecture overview
// ─────────────────────────────────────────────────────────────────────────────
//
//  ABSORB ──────────────────────────────────────────────────────────────────
//    1. Store full text as parent document.
//    2. Section-aware overlapping chunking (_advancedChunk):
//         ▸ Split on double-newlines / ### headers → paragraphs
//         ▸ Within each paragraph apply sliding window (4 sent, 1 overlap)
//         ▸ Chunks never cross section boundaries → semantically clean
//    3. Contextual enrichment before embedding:
//         ▸ embedText = "Section: <title>\n\n<chunk>" (Anthropic technique)
//         ▸ Store raw chunk text but embed contextualised version
//    4. Embed → store child doc + vector with deduplication.
//
//  RECALL ──────────────────────────────────────────────────────────────────
//    1. Dense retrieval  : Atlas $vectorSearch (ANN, fetches N×5 candidates).
//    2. Sparse retrieval : MongoDB tag/keyword search on _manas_content.
//    3. RRF fusion       : Reciprocal Rank Fusion merges both ranked lists.
//    4. Keyword boost    : +4 % per rare query token found in chunk text.
//    5. Cosine reranking : Fetch candidate vectors separately, compute exact
//                          cosine(queryVector, chunkVector) — replaces ANN score.
//    6. MMR              : Maximal Marginal Relevance diversity pass.
//    7. Context healing  : Map each selected chunk → its full parent document.
//    8. Context window   : Return the specific matched chunk + section title,
//                          not just the opaque full-document blob.
//
// ─────────────────────────────────────────────────────────────────────────────

class ManasDB {
  /**
   * Creates a new ManasDB instance.
   *
   * @param {Object} config
   * @param {string}  config.uri          - MongoDB connection string.
   * @param {string}  [config.dbName]     - Database name.
   * @param {string}  [config.projectName]- Project namespace.
   * @param {Object}  [config.modelConfig]- { source, model } for embedding provider.
   * @param {boolean|Object} [config.piiShield=false]
   * @param {boolean}  [config.telemetry=true]
   */
  constructor({ uri, dbName, projectName, modelConfig, piiShield, telemetry = true, debug = false }) {
    this.uri         = uri;
    this.dbName      = dbName;
    this.projectName = projectName;
    this.modelConfig = modelConfig || { source: 'transformers' };
    this.debug       = debug === true;

    // Semantic cache: two structures for O(1) exact hit + bounded fuzzy scan
    this.semanticCache      = [];          // ordered array for fuzzy cosine scan (capped at 200)
    this.semanticCacheIndex = new Map();   // hash → results for O(1) exact lookup

    Telemetry.enabled = telemetry === true;

    this.piiShield = { enabled: false, customRules: [] };
    if (piiShield === true) {
      this.piiShield.enabled = true;
    } else if (typeof piiShield === 'object' && piiShield !== null) {
      this.piiShield.enabled     = piiShield.enabled !== undefined ? piiShield.enabled : true;
      this.piiShield.customRules = Array.isArray(piiShield.customRules) ? piiShield.customRules : [];
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  init()
  // ══════════════════════════════════════════════════════════════════════════

  async init() {
    await MongoConnection.connect(this.uri, this.dbName);
    await MongoConnection.validateEnvironment();

    const db               = MongoConnection.getDb();
    const vectorsCollection = db.collection('_manas_vectors');
    const chunksCollection  = db.collection('_manas_chunks');
    const docsCollection    = db.collection('_manas_documents');

    // ── Document Index for fast deduplication ──────────────────────────────
    try {
      await docsCollection.createIndex({ content_hash: 1, project: 1 });
    } catch (_) { /* index already exists */ }

    // ── Text index for hybrid sparse retrieval on chunks ───────────────────
    try {
      await chunksCollection.createIndex(
        { text: 'text', 'tags.keywords': 'text' },
        { name: 'text_search_index', default_language: 'english' }
      );
    } catch (_) { /* index already exists */ }

    // ── Compound index for fast context-healing queries ───────────────────
    try {
      await chunksCollection.createIndex({ document_id: 1, chunk_index: 1 });
    } catch (_) { /* index already exists */ }

    // ── Compound index for fast embedding deduplication lookups ───────────
    try {
      await vectorsCollection.createIndex({ embedding_hash: 1 });
    } catch (_) { /* index already exists */ }

    // ── Atlas vector index ─────────────────────────────────────────────────
    try {
      const existingIndexes = await vectorsCollection.listSearchIndexes().toArray();

      // ── Stale index guard: warn if multiple dimension indexes found ────────
      if (existingIndexes.length > 2) {
        console.warn(`⚠️ MANASDB_WARNING: ${existingIndexes.length} Atlas search indexes found. Consider running 'npx manas index-prune' to remove stale indexes from old models.`);
      }

      let dimensionTarget = 384;
      try {
        const reg = (await Promise.resolve(require('./utils/ModelRegistry.js'))).default;
        const d   = reg.getDimensions(this.modelConfig.model || this.modelConfig.source);
        if (d) dimensionTarget = d;
      } catch (_) {}

      const indexName  = `vector_index_${dimensionTarget}`;
      const vectorIndex = existingIndexes.find(idx => idx.name === indexName);

      if (!vectorIndex) {
        console.log(`ManasDB: Creating vector index ${indexName}...`);
        await vectorsCollection.createSearchIndex({
          name: indexName,
          type: 'vectorSearch',
          definition: {
            fields: [
              { type: 'vector', path: 'vector', numDimensions: dimensionTarget, similarity: 'cosine' },
              { type: 'filter', path: 'model' },
              { type: 'filter', path: 'profile' }
            ]
          }
        });
        await this._waitForIndexReady(vectorsCollection, indexName);
      } else {
        if (vectorIndex.status !== 'READY') {
          await this._waitForIndexReady(vectorsCollection, indexName);
        } else {
          console.log(`ManasDB: ${indexName} is READY.`);
        }
      }
    } catch (error) {
      if (error.codeName !== 'CommandNotFound') {
        console.warn('️ MANASDB_WARNING: Failed to verify/create vector index.', error.message);
      }
    }

    console.log(`ManasDB initialized  project: ${this.projectName}`);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Static helpers
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Normalises Unicode smart-quotes to straight apostrophe and lowercases.
   * @param {string} s
   * @returns {string}
   */
  static _normalise(s) {
    return (s || '').replace(/[\u2018\u2019\u201A\u201B\u2032]/g, "'")
                    .replace(/[\u201C\u201D\u201E\u2033]/g, '"')
                    .toLowerCase();
  }

  /**
   * Cosine similarity between two numeric vectors.
   */
  static _cosine(a, b) {
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      na  += a[i] * a[i];
      nb  += b[i] * b[i];
    }
    return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-9);
  }

  /**
   * Token-aware sliding window chunker.
   *
   * @param {string} text
   * @param {number} [maxTokens=256]
   * @param {number} [overlapTokens=32]
   */
  static _tokenAwareChunk(text, maxTokens = 256, overlapTokens = 32) {
    const normalised = text
      .replace(/\r\n/g, '\n')
      .replace(/(^|\n)(#{1,3}\s)/g, '\n\n$2');

    const paragraphs = normalised
      .split(/\n{2,}/)
      .map(p => p.trim())
      .filter(p => p.length > 15);

    const results = [];

    for (const para of paragraphs) {
      const headerMatch = para.match(/^#{1,3}\s+(.+?)(?:\n|$)/);
      const sectionTitle = headerMatch ? headerMatch[1].trim() : '';
      const bodyText = headerMatch ? para.slice(headerMatch[0].length).trim() : para;

      if (!bodyText) continue;

      const sentences = bodyText
        .split(/(?<=[.!?])\s+/)
        .map(s => s.trim())
        .filter(s => s.length > 5);

      if (sentences.length === 0) {
        results.push({
          text: bodyText,
          sectionTitle,
          embedText: sectionTitle ? `Section: ${sectionTitle}\n\n${bodyText}` : bodyText,
          chunkIndex: 0,
          totalInSection: 1,
          microChunks: [bodyText]
        });
        continue;
      }

      const sectionChunks = [];
      let currentChunkSentences = [];
      let currentTokens = 0;

      for (let i = 0; i < sentences.length; i++) {
        const sentence = sentences[i];
        const sentenceTokens = Math.ceil(sentence.length / 4);

        if (currentTokens + sentenceTokens > maxTokens && currentChunkSentences.length > 0) {
          sectionChunks.push({
             text: currentChunkSentences.join(' '),
             sentences: [...currentChunkSentences]
          });
          
          let backtrackTokens = 0;
          let keepFromEnd = [];
          for (let j = currentChunkSentences.length - 1; j >= 0; j--) {
            const toks = Math.ceil(currentChunkSentences[j].length / 4);
            if (backtrackTokens + toks > overlapTokens && keepFromEnd.length > 0) break;
            backtrackTokens += toks;
            keepFromEnd.unshift(currentChunkSentences[j]);
          }
          currentChunkSentences = [...keepFromEnd, sentence];
          currentTokens = backtrackTokens + sentenceTokens;
        } else {
          currentChunkSentences.push(sentence);
          currentTokens += sentenceTokens;
        }
      }

      if (currentChunkSentences.length > 0) {
        sectionChunks.push({
           text: currentChunkSentences.join(' '),
           sentences: [...currentChunkSentences]
        });
      }

      const total = sectionChunks.length;
      sectionChunks.forEach((chunkObj, idx) => {
        const embedText = sectionTitle
          ? `Section: ${sectionTitle}\n\n${chunkObj.text}`
          : chunkObj.text;

        results.push({
          text: chunkObj.text,
          sectionTitle,
          embedText,
          chunkIndex: idx,
          totalInSection: total,
          microChunks: chunkObj.sentences
        });
      });
    }

    return results;
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  absorb()
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Stores a document as a structured memory in MongoDB with embedded vectors.
   *
   * @param {string} rawText
   * @param {Object} [options]
   * @param {string} [options.profile='balanced']   - 'speed'|'balanced'|'accuracy'
   * @param {number} [options.chunkSize=4]          - Sentences per chunk window.
   * @param {number} [options.chunkOverlap=1]       - Overlap sentences between chunks.
   * @returns {Promise<{contentId, vectorId, chunks: number}>}
   */
  async absorb(rawText, options = {}) {
    const timer = Telemetry.startTimer();
    if (typeof rawText !== 'string' || !rawText.trim()) {
      throw new Error('MANASDB_ABSORB_ERROR: Text must be a non-empty string.');
    }

    let text = rawText;
    if (this.piiShield.enabled) {
      text = PIIFilter.redact(rawText, this.piiShield.customRules);
    }

    const db                = MongoConnection.getDb();
    const chunksCollection  = db.collection('_manas_chunks');
    const docsCollection    = db.collection('_manas_documents');
    const vectorsCollection = db.collection('_manas_vectors');

    const provider       = ModelFactory.getProvider(this.modelConfig);
    const tokens         = CostCalculator.estimateTokens(text);
    const potential_cost = CostCalculator.estimateSavings(tokens, provider.getModelKey());

    let actual_cost      = potential_cost;
    let savings_financial = 0;
    let savings_latency  = 0;
    let isDeduplicated   = false;

    try {
      // ── Step 1: Parent document (metadata only) ──────────────────────────
      const thisProject = this.projectName || 'default';
      const parent_hash = crypto.createHash('sha256').update(text).digest('hex');
      let parentDoc = await docsCollection.findOne({
        content_hash: parent_hash,
        project: thisProject,
      });
      let document_id;

      // ── Step 2: Token-aware chunking ────────────────────────────────────────
      const maxTokens     = options.maxTokens ?? 100;
      const overlapTokens = options.overlapTokens ?? 20;
      const chunks        = ManasDB._tokenAwareChunk(text, maxTokens, overlapTokens);

      if (parentDoc) {
        document_id = parentDoc._id;
      } else {
        const parentTags   = MemoryEngine.extractTags(text);
        const parentResult = await docsCollection.insertOne({
          tags: parentTags, 
          content_hash: parent_hash,
          chunk_count: chunks.length,
          project: thisProject,
          createdAt: new Date()
        });
        document_id = parentResult.insertedId;
      }

      const profile = options.profile || 'balanced';
      let targetDims;
      if (profile === 'speed')    targetDims = 128;
      else if (profile === 'balanced') targetDims = 512;
      else if (profile === 'accuracy') {
        const reg = (await Promise.resolve(require('./utils/ModelRegistry.js'))).default;
        const d   = reg.getDimensions(this.modelConfig.model || this.modelConfig.source);
        if (d) targetDims = d;
      }

      let lastVectorId = null;

      // ── Step 3: Embed each chunk (with deduplication) ────────────────────
      for (const chunk of chunks) {
        const { text: chunkText, embedText, sectionTitle, chunkIndex, totalInSection } = chunk;

        if (!chunkText.trim()) continue;

        const child_hash = crypto.createHash('sha256').update(chunkText).digest('hex');
        let childDoc     = await chunksCollection.findOne({
          chunk_hash: child_hash,
          project: thisProject,
        });
        let chunk_id;

        if (childDoc) {
          chunk_id = childDoc._id;
        } else {
          const childTags   = MemoryEngine.extractTags(chunkText);
          const childResult = await chunksCollection.insertOne({
            document_id:   document_id,
            chunk_index:   chunkIndex,
            chunk_hash:    child_hash,
            text:          chunkText,
            embedText,
            sectionTitle,
            totalInSection,
            tags:          childTags,
            project:       thisProject,
            createdAt:     new Date()
          });
          chunk_id = childResult.insertedId;
        }

        // ── Atomic upsert: avoids TOCTOU race on concurrent absorb calls ──
        const embedding_hash = crypto.createHash('sha256')
          .update(child_hash + provider.getModelKey() + profile)
          .digest('hex');

        let vector_id;
        // Check first (cheap) — only embed if truly missing
        let vectorDoc = await vectorsCollection.findOne({ embedding_hash }, { projection: { _id: 1 } });

        if (vectorDoc) {
          vector_id         = vectorDoc._id;
          isDeduplicated    = true;
          actual_cost       = 0;
          savings_financial = potential_cost;
          savings_latency   = provider.getModelKey().includes('gemini') ||
                              provider.getModelKey().includes('openai') ? 500 : 50;
        } else {
          const { vector, dims, model, originalDims } = await provider.embed(embedText, targetDims);
          
          let finalVector = vector;
          let storedPrecision = options.precision || 'float32';

          if (storedPrecision === 'int8') {
             finalVector = vector.map(v => Math.max(-128, Math.min(127, Math.round(v * 127))));
          } else if (storedPrecision === 'float16') {
             finalVector = vector.map(v => Number(v.toFixed(4)));
          }

          // Atomic upsert: if two concurrent absorbs race, only one wins──
          const upsertResult = await vectorsCollection.findOneAndUpdate(
            { embedding_hash },
            { $setOnInsert: {
                chunk_id, document_id, model, dims, profile, originalDims,
                precision: storedPrecision, vector: finalVector, vector_full: vector, embedding_hash,
                createdAt: new Date(),
              }
            },
            { upsert: true, returnDocument: 'after', projection: { _id: 1 } }
          );
          vector_id = upsertResult._id;
          if (this.debug) {
            console.log(`ManasDB DEBUG: Stored vector with model="${model}", profile="${profile}"`);
          }
        }
        lastVectorId = vector_id;

        // ── Step 3.5: Batched Sentence Micro-Index (20 sentences per batch) ─
        if (chunk.microChunks && chunk.microChunks.length > 0) {
          const storedPrecision = options.precision || 'float32';
          const sProfile = profile + '_sentence';
          const BATCH_SIZE = 20;

          for (let bStart = 0; bStart < chunk.microChunks.length; bStart += BATCH_SIZE) {
            const batch = chunk.microChunks.slice(bStart, bStart + BATCH_SIZE);

            // Compute all hashes in the batch first
            const batchMeta = batch.map(sentenceRaw => {
              const sHash = crypto.createHash('sha256').update(sentenceRaw).digest('hex');
              const sEmbeddingHash = crypto.createHash('sha256').update(sHash + provider.getModelKey() + sProfile).digest('hex');
              const mEmbedText = chunk.sectionTitle ? `Section: ${chunk.sectionTitle}\n\n${sentenceRaw}` : sentenceRaw;
              return { sentenceRaw, sHash, sEmbeddingHash, mEmbedText };
            });

            // Find which hashes already exist with a SINGLE query
            const existingHashes = new Set(
              (await vectorsCollection.find(
                { embedding_hash: { $in: batchMeta.map(m => m.sEmbeddingHash) } },
                { projection: { embedding_hash: 1 } }
              ).toArray()).map(doc => doc.embedding_hash)
            );

            // Only embed sentences that are genuinely new
            const newSentences = batchMeta.filter(m => !existingHashes.has(m.sEmbeddingHash));

            // Embed in parallel within the batch (not serially)
            const embedResults = await Promise.all(
              newSentences.map(m => provider.embed(m.mEmbedText, targetDims).then(d => ({ ...m, embedData: d })))
            );

            if (embedResults.length > 0) {
              const bulkOps = embedResults.map(({ sEmbeddingHash, embedData }) => {
                let sFinalVector = embedData.vector;
                if (storedPrecision === 'int8') {
                  sFinalVector = sFinalVector.map(v => Math.max(-128, Math.min(127, Math.round(v * 127))));
                } else if (storedPrecision === 'float16') {
                  sFinalVector = sFinalVector.map(v => Number(v.toFixed(4)));
                }
                return {
                  updateOne: {
                    filter: { embedding_hash: sEmbeddingHash },
                    update: { $setOnInsert: {
                      chunk_id, document_id, model: embedData.model, dims: embedData.dims,
                      profile: sProfile, originalDims: embedData.originalDims,
                      precision: storedPrecision, vector: sFinalVector, vector_full: embedData.vector,
                      embedding_hash: sEmbeddingHash, createdAt: new Date(),
                    }},
                    upsert: true
                  }
                };
              });
              await vectorsCollection.bulkWrite(bulkOps, { ordered: false });
            }
          }
        }
      }

      const dur = Telemetry.endTimer(timer);
      Telemetry.logEvent(isDeduplicated ? 'DEDUPLICATED' : 'ABSORB_COMPLETED', {
        projectName: thisProject, durationMs: dur,
        tokens, actual_cost, potential_cost, savings_financial, savings_latency,
      });

      return { contentId: document_id, vectorId: lastVectorId, chunks: chunks.length };

    } catch (error) {
      console.error('MANASDB_ABSORB_ERROR:', error);
      const dur = Telemetry.endTimer(timer);
      Telemetry.logEvent('ABSORB_ERROR', { projectName: this.projectName || 'default', durationMs: dur });
      throw error;
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  recall()
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Recalls semantically matching memories using a hybrid retrieval pipeline.
   *
   * Pipeline stages:
   *   [A] Dense retrieval  — Atlas $vectorSearch ANN
   *   [B] Sparse retrieval — MongoDB text/tag search
   *   [C] RRF fusion       — merge ranked lists from A + B
   *   [D] Keyword boost    — +4% per rare entity hit in chunk text
   *   [E] Cosine rerank    — exact cosine via separate vector fetch (trusted score)
   *   [F] MMR              — maximal marginal relevance diversity pass
   *   [G] Context healing  — map chunks → full parent documents
   *
   * @param {string} query
   * @param {Object} [options]
   * @param {number} [options.limit=5]          - Final results to return.
   * @param {number} [options.minScore=0.05]    - Minimum cosine score after reranking.
   * @param {string} [options.profile='balanced']
   * @param {number} [options.lambda=0.6]       - MMR λ (1=pure relevance, 0=pure diversity).
   * @param {number} [options.rrfK=60]          - RRF constant k (higher = more uniform fusion).
   * @returns {Promise<Array>}
   */
  async recall(query, options = {}) {
    const timer = Telemetry.startTimer();
    const traceLog = {
      cacheHit: false, piiScrubbed: 0, denseCandidates: 0, sparseCandidates: 0,
      rrfMerged: 0, mmrSelected: 0, fallbackTriggered: false, finalScore: 0
    };

    if (typeof query !== 'string' || !query.trim()) {
      throw new Error('MANASDB_RECALL_ERROR: Query must be a non-empty string.');
    }

    const db                = MongoConnection.getDb();
    const vectorsCollection = db.collection('_manas_vectors');
    const chunksCollection  = db.collection('_manas_chunks');
    const docsCollection    = db.collection('_manas_documents');

    // ── 1. Resolve profile → target dims ─────────────────────────────────
    const baseProfile = options.profile || 'balanced';
    const activeProfile = options.mode === 'qa' ? baseProfile + '_sentence' : baseProfile;

    let targetDims;
    if (baseProfile === 'speed')    targetDims = 128;
    else if (baseProfile === 'balanced') targetDims = 512;
    else if (baseProfile === 'accuracy') {
      const reg = (await Promise.resolve(require('./utils/ModelRegistry.js'))).default;
      const d   = reg.getDimensions(this.modelConfig.model || this.modelConfig.source);
      if (d) targetDims = d;
    }

    // ── 2. Embed query once — reused for both ANN and cosine reranking ────
    const provider = ModelFactory.getProvider(this.modelConfig);
    const { vector: queryVector, dims } = await provider.embed(query, targetDims);

    // ── 2b. Semantic Cosine Cache Check ──────────────────────────────────
    const queryHash = crypto.createHash('sha256').update(query).digest('hex');

    // O(1) exact hit via Map index
    if (this.semanticCacheIndex.has(queryHash)) {
      if (this.debug || options.debug) console.log(`ManasDB DEBUG: Cache exact hit for query: "${query}"`);
      const cached = this.semanticCacheIndex.get(queryHash);
      cached._trace = { ...traceLog, cacheHit: true };
      return cached;
    }

    // Bounded fuzzy scan: only check the 10 most-recent entries to keep CPU flat
    const FUZZY_WINDOW = Math.min(10, this.semanticCache.length);
    for (let i = this.semanticCache.length - 1; i >= this.semanticCache.length - FUZZY_WINDOW; i--) {
      const entry = this.semanticCache[i];
      if (ManasDB._cosine(queryVector, entry.queryVector) > 0.95) {
        if (this.debug || options.debug) console.log(`ManasDB DEBUG: Semantic cache fuzzy hit!`);
        return entry.results;
      }
    }

    const limit      = options.limit    ?? 5;
    const minScore   = options.minScore ?? 0.05;
    const LAMBDA     = options.lambda   ?? 0.6;
    const RRF_K      = options.rrfK     ?? 60;
    // Hard ceiling: prevents unbounded heap allocation at scale
    // 200 vectors × 768 floats × 8 bytes = ~1.2MB max per call
    const MAX_FETCH  = options.maxFetch  ?? 200;
    const fetchLimit = Math.min(Math.max(limit * 5, 20), MAX_FETCH);
    const indexName  = `vector_index_${dims}`;

    // ── Keyword extraction for boost + sparse search ───────────────────────
    const STOPWORDS = new Set([
      'what','is','the','a','an','of','for','in','to','and','or','are','was',
      'were','by','at','from','which','that','this','it','its','have','has',
      'be','on','with','used','does','how','name','type','material','needed',
      'main','three','first','specific','typical','term','describes','acronym',
      'stands','claim','used','mention','researching','basis','required',
    ]);
    const normQuery  = ManasDB._normalise(query);
    const queryTokens = normQuery.match(/[a-z0-9']+/g) || [];
    // Allow 3-letter acronyms like GPT, RAG, AGI
    const rareTokens  = queryTokens.filter(t => t.length > 2 && !STOPWORDS.has(t));

    try {
      // ══════════════════════════════════════════════════════════════════════
      //  Stage A — Dense retrieval via Atlas ANN
      // ══════════════════════════════════════════════════════════════════════
      // IMPORTANT: We do NOT project `vector: 1` here.
      // Atlas vectorSearch aggregation stage often cannot project large float
      // arrays back through the pipeline. Instead we fetch vectors in a
      // separate find() below (Stage E) — this is the correct pattern.
      if (this.debug || options.debug) {
        console.log(`ManasDB DEBUG: Querying with model="${provider.getModelKey()}", profile="${activeProfile}" (Mode: ${options.mode || 'document'})`);
      }

      const annPipeline = [
        {
          $vectorSearch: {
            index: indexName,
            path:  'vector',
            queryVector,
            numCandidates: fetchLimit * 10,
            limit: fetchLimit,
            filter: { profile: activeProfile, model: provider.getModelKey() },
          },
        },
        {
          $project: {
            _id: 1, chunk_id: 1, document_id: 1,
            annScore: { $meta: 'vectorSearchScore' },  // ANN cosine approx
          },
        },
        {
          $lookup: {
            from:         '_manas_chunks',
            localField:   'chunk_id',
            foreignField: '_id',
            as:           'contentDetails',
          },
        },
        // NOTE: We intentionally do NOT $match by project here.
        // Atlas vectorSearch + $lookup + $match on array field can silently drop
        // results in some driver versions. Project scoping is done in JS below.
      ];


      // ══════════════════════════════════════════════════════════════════════
      //  Stage B — Sparse retrieval via MongoDB text + tag search
      // ══════════════════════════════════════════════════════════════════════
      const sparseFilter = {
        project:  this.projectName || 'default',
      };
      
      const orClauses = [];
      const stem = w => w.length > 4 ? w.replace(/[e]?s$|ing$|ed$|ly$|[e]$/i, '') : w;
      if (rareTokens.length > 0) {
        orClauses.push({ 'tags.keywords': { $in: rareTokens } });
        orClauses.push({ text: { $regex: rareTokens.map(stem).filter(w => w.length > 2).slice(0, 5).join('|'), $options: 'i' } });
      } else if (queryTokens.length > 0) {
        orClauses.push({ text: { $regex: queryTokens.map(stem).filter(w => w.length > 2).slice(0, 4).join('|'), $options: 'i' } });
      }

      if (orClauses.length > 0) {
        sparseFilter.$or = orClauses;
      }

      // Adaptive Retrieval Mode
      let isNumericQuery = /\d+/.test(query);
      let queryLenTokens = CostCalculator.estimateTokens(normQuery);
      
      let denseWeight = 0.5;
      let sparseWeight = 0.5;
      let fetchDense = true;

      if (queryLenTokens < 3) {
        fetchDense = false;
        denseWeight = 0.0;
        sparseWeight = 1.0;
      } else if (/[A-Z][a-z]+/.test(query)) {
        denseWeight = 0.8;
        sparseWeight = 0.2;
      } else if (isNumericQuery) {
        denseWeight = 0.2;
        sparseWeight = 0.8;
      } else if (queryLenTokens < 6) {
        denseWeight = 0.3;
        sparseWeight = 0.7;
      } else if (queryLenTokens > 15) {
        denseWeight = 0.8;
        sparseWeight = 0.2;
      }

      // Run both retrievals in parallel
      const annRawPromise = fetchDense 
        ? vectorsCollection.aggregate(annPipeline).toArray()
        : Promise.resolve([]);
        
      const sparseRawPromise = chunksCollection.find(sparseFilter).limit(fetchLimit).toArray();

      const [annRaw, sparseRaw] = await Promise.all([annRawPromise, sparseRawPromise]);

      traceLog.denseCandidates = annRaw.length;
      traceLog.sparseCandidates = sparseRaw.length;

      // If BOTH signals return nothing, fall back to canonical
      if (annRaw.length === 0 && sparseRaw.length === 0) {
        traceLog.fallbackTriggered = true;
        const fbResult = await this._canonicalRecall(query, limit);
        fbResult._trace = traceLog;
        return fbResult;
      }

      // ══════════════════════════════════════════════════════════════════════
      //  Stage C — Reciprocal Rank Fusion (RRF)
      //   score_rrf = Σ  1 / (k + rank_i)
      // ══════════════════════════════════════════════════════════════════════
      // Build a unified map: chunk_id → {annRank, sparseRank, child}
      const candidateMap = new Map(); // keyed by chunk_id string

      // ANN results — filtered by project in-process (safer than $match in pipeline)
      const targetProject = this.projectName || 'default';
      annRaw.forEach((res, rank) => {
        const child = res.contentDetails?.[0];
        if (!child) return;
        // ── Project scoping: discard results from other projects ────────────
        if (child.project && child.project !== targetProject) return;
        const cid = res.chunk_id.toString();
        if (!candidateMap.has(cid)) {
          candidateMap.set(cid, {
            vecDocId:   res._id,   // vector doc _id — needed for vector fetch below
            chunk_id:   res.chunk_id,
            child,
            annRank:    rank,
            sparseRank: null,
            annScore:   res.annScore || 0,
          });
        }
      });

      // Sparse results (child-level docs from _manas_chunks)
      sparseRaw.forEach((childDoc, rank) => {
        const cid = childDoc._id.toString();
        // Look up the matching entry by chunk_id
        if (candidateMap.has(cid)) {
          candidateMap.get(cid).sparseRank = rank;
        } else {
          candidateMap.set(cid, {
            vecDocId:   null,
            chunk_id:   childDoc._id,
            child:      childDoc,
            annRank:    null,
            sparseRank: rank,
            annScore:   0,
          });
        }
      });

      // Compute RRF score
      const candidates = Array.from(candidateMap.values()).map(c => {
        const annContrib    = c.annRank    !== null ? denseWeight / (RRF_K + c.annRank)    : 0;
        const sparseContrib = c.sparseRank !== null ? sparseWeight / (RRF_K + c.sparseRank) : 0;
        return { ...c, rrfScore: annContrib + sparseContrib };
      });

      // Sort by RRF score descending
      candidates.sort((a, b) => b.rrfScore - a.rrfScore);
      const topCandidates = candidates.slice(0, fetchLimit);

      // ══════════════════════════════════════════════════════════════════════
      //  Stage D — Keyword boost
      // ══════════════════════════════════════════════════════════════════════
      const boosted = topCandidates.map(c => {
        const childText    = ManasDB._normalise(c.child.text);
        const keywordHits  = rareTokens.filter(tok => childText.includes(tok)).length;
        const keywordBoost = keywordHits * 0.04;
        return { ...c, boostedRrf: Math.min(1.0, c.rrfScore * 100 + keywordBoost) };
        // × 100 scales tiny RRF scores to the 0-1 neighbourhood for MMR comparability
      });
      boosted.sort((a, b) => b.boostedRrf - a.boostedRrf);

      // ══════════════════════════════════════════════════════════════════════
      //  Stage E — Exact cosine reranking
      //   Fetch stored vectors for all top candidates in ONE query, then
      //   compute exact cosine(queryVector, chunkVector).
      //   This is far more accurate than the approximate ANN score.
      // ══════════════════════════════════════════════════════════════════════
      const vecDocIds = boosted
        .filter(c => c.vecDocId)
        .map(c => c.vecDocId);

      let vecMap = {};
      if (vecDocIds.length > 0) {
        const { ObjectId } = (await Promise.resolve(require('mongodb')));
        const vecDocs = await vectorsCollection.find(
          { _id: { $in: vecDocIds } },
          { projection: { _id: 1, vector: 1, vector_full: 1 } }
        ).toArray();
        vecMap = Object.fromEntries(vecDocs.map(v => [v._id.toString(), v.vector_full || v.vector]));
      }

      const reranked = boosted.map(c => {
        const storedVec   = c.vecDocId ? vecMap[c.vecDocId.toString()] : null;
        const cosineScore = storedVec
          ? ManasDB._cosine(queryVector, storedVec)
          : c.annScore;  // fallback to ANN score if vector not found

        // Final score = cosine + keyword boost (+ tiny rrf tie-breaker)
        const childNorm    = ManasDB._normalise(c.child.text);
        const keywordHits  = rareTokens.filter(tok => childNorm.includes(tok)).length;
        const finalScore   = Math.min(1.0, cosineScore + keywordHits * 0.04);

        return { ...c, storedVec, cosineScore, finalScore };
      });

      // Filter by minimum acceptable cosine similarity
      const filtered = reranked.filter(c => c.finalScore >= minScore);

      if (filtered.length === 0) {
        traceLog.fallbackTriggered = true;
        const fbResult = await this._canonicalRecall(query, limit);
        fbResult._trace = traceLog;
        return fbResult;
      }

      filtered.sort((a, b) => b.finalScore - a.finalScore);

      traceLog.rrfMerged = filtered.length;

      // ══════════════════════════════════════════════════════════════════════
      //  Stage F — MMR (Maximal Marginal Relevance)
      //   Greedy selection: maximise relevance, penalise redundancy between
      //   already-selected chunks using their stored vectors.
      // ══════════════════════════════════════════════════════════════════════
      const selected   = [];
      const pool       = [...filtered];

      while (selected.length < limit && pool.length > 0) {
        let bestIdx = -1, bestMmr = -Infinity;

        for (let i = 0; i < pool.length; i++) {
          const cand     = pool[i];
          const relevance = cand.finalScore;

          // Maximum cosine similarity to already-selected chunks
          let maxRedundancy = 0;
          for (const sel of selected) {
            if (cand.storedVec && sel.storedVec) {
              const sim = ManasDB._cosine(cand.storedVec, sel.storedVec);
              if (sim > maxRedundancy) maxRedundancy = sim;
            }
          }

          const mmr = LAMBDA * relevance - (1 - LAMBDA) * maxRedundancy;
          if (mmr > bestMmr) { bestMmr = mmr; bestIdx = i; }
        }

        if (bestIdx === -1) break;
        selected.push(pool[bestIdx]);
        pool.splice(bestIdx, 1);
      }

      // ══════════════════════════════════════════════════════════════════════
      //  Stage G — Context healing: chunks → dynamic full parent documents
      //   Instead of storing duplicated full text in the parent document,
      //   we query all chunks sharing the same document_id and merge them sorted on-the-fly.
      // ══════════════════════════════════════════════════════════════════════
      const { ObjectId } = (await Promise.resolve(require('mongodb')));
      const parentBestScore    = {};
      const parentMatchedChunk = {};
      const parentSectionTitle = {};
      const parentAllScores    = {};
      const parentIds          = new Set();
      const parentToChunks     = {};

      for (const c of selected) {
        const child  = c.child;
        const pidStr = child.document_id.toString();
        parentIds.add(pidStr);

        if (!parentToChunks[pidStr]) {
            parentToChunks[pidStr] = [];
        }
        parentToChunks[pidStr].push(c);

        if (!parentBestScore[pidStr] || c.finalScore > parentBestScore[pidStr]) {
          parentBestScore[pidStr]    = c.finalScore;
          parentMatchedChunk[pidStr] = child.text;
          parentSectionTitle[pidStr] = child.sectionTitle || '';
        }
        if (!parentAllScores[pidStr]) parentAllScores[pidStr] = [];
        parentAllScores[pidStr].push({
          text:         child.text,
          sectionTitle: child.sectionTitle || '',
          score:        Number(c.finalScore.toFixed(4)),
          cosineScore:  Number(c.cosineScore.toFixed(4)),
          rrfScore:     Number(c.rrfScore.toFixed(6)),
        });
      }

      const parentObjectIds = Array.from(parentIds).slice(0, limit).map(id => new ObjectId(id));
      
      const MAX_CHUNKS_PER_DOC = options.maxChunksPerDoc ?? 100;
      const allChunksDoc = await chunksCollection
        .find({ document_id: { $in: parentObjectIds } })
        .sort({ chunk_index: 1 })
        .limit(parentObjectIds.length * MAX_CHUNKS_PER_DOC) // memory guard: cap total chunks loaded
        .project({ document_id: 1, text: 1 })
        .toArray();

      const docTextBuilder = {};
      for (const chk of allChunksDoc) {
        const d_id = chk.document_id.toString();
        if (!docTextBuilder[d_id]) docTextBuilder[d_id] = [];
        docTextBuilder[d_id].push(chk.text);
      }

      const healedParents = parentObjectIds.map(oid => {
         const d_id = oid.toString();
         return {
             _id: oid,
             text: (docTextBuilder[d_id] || []).join(' ')
         };
      });

      healedParents.sort((a, b) =>
        (parentBestScore[b._id.toString()] || 0) - (parentBestScore[a._id.toString()] || 0)
      );

      const tokCount   = CostCalculator.estimateTokens(query);
      const potCost    = CostCalculator.estimateSavings(tokCount, provider.getModelKey());
      const healedToks = healedParents.reduce((acc, d) => acc + CostCalculator.estimateTokens(d.text || ''), 0);
      const dur        = Telemetry.endTimer(timer);

      Telemetry.logEvent('RECALL_VECTOR_MATCH', {
        projectName: this.projectName || 'default', durationMs: dur,
        tokens: healedToks, actual_cost: potCost, potential_cost: potCost,
        savings_financial: 0, metadata: { resultsCount: healedParents.length },
      });

      const finalResults = healedParents.map(doc => ({
        contentId: doc._id,
        text:      doc.text,
        tags:      doc.tags,
        score:     parentBestScore[doc._id.toString()] || 0,
        metadata:  {
          ...(doc.metadata || {}),
          // Specific chunk that best answered the query
          matchedChunk:  parentMatchedChunk[doc._id.toString()] || doc.text,
          sectionTitle:  parentSectionTitle[doc._id.toString()] || '',
          // All contributing child chunks with scores
          allScores:     parentAllScores[doc._id.toString()] || [],
          healedContext: true,
        },
      }));
      
      traceLog.mmrSelected = finalResults.length;
      traceLog.finalScore = finalResults.length > 0 ? Number(finalResults[0].score.toFixed(4)) : 0;
      finalResults._trace = traceLog;

      // Atomic cache write — guarded by Map to prevent duplicate entries
      if (!this.semanticCacheIndex.has(queryHash)) {
        this.semanticCache.push({ hash: queryHash, queryVector, results: finalResults });
        this.semanticCacheIndex.set(queryHash, finalResults);
        if (this.semanticCache.length > 200) {
          const evicted = this.semanticCache.shift();
          if (evicted) this.semanticCacheIndex.delete(evicted.hash);
        }
      }
      
      return finalResults;

    } catch (error) {
      console.warn('RECALL PIPELINE ERROR:', error);
      traceLog.fallbackTriggered = true;
      const fbResult = await this._canonicalRecall(query, limit);
      fbResult._trace = traceLog;
      return fbResult;
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  _canonicalRecall()  —  fallback when vector search yields nothing
  // ══════════════════════════════════════════════════════════════════════════

  async _canonicalRecall(query, limit) {
    console.log('⚠️ MANASDB_HEALING: Vector search yielded no results or was bypassed. Falling back to Canonical Search.');

    const db               = MongoConnection.getDb();
    const chunksCollection = db.collection('_manas_chunks');
    const docsCollection   = db.collection('_manas_documents');

    let cleanedQuery = query;
    if (this.piiShield.enabled) {
      const PIIFilter = (await Promise.resolve(require('./utils/PIIFilter.js'))).default;
      cleanedQuery = PIIFilter.redact(query);
    }

    const MemoryEngine = (await Promise.resolve(require('./core/memory-engine.js'))).default;
    const extracted    = MemoryEngine.extractTags(cleanedQuery);
    const tags         = extracted ? extracted.keywords : [];

    // Always try BOTH tag match AND text regex — union ensures we never miss a
    // document that IS in the DB but whose tags don't align with the query tokens.
    const orClauses = [];
    if (tags && tags.length > 0) {
      orClauses.push({ 'tags.keywords': { $in: tags } });
    }
    const STOPWORDS = new Set([
      'what','is','the','a','an','of','for','in','to','and','or','are','was',
      'were','by','at','from','which','that','this','it','its','have','has',
      'be','on','with','used','does','how','name','type','material','needed',
      'main','three','first','specific','typical','term','describes','acronym',
      'stands','claim','used','mention','researching','basis','required',
    ]);
    const normQuery   = ManasDB._normalise(cleanedQuery);
    const queryTokens = normQuery.match(/[a-z0-9']+/g) || [];
    const rareTokens  = queryTokens.filter(t => t.length > 2 && !STOPWORDS.has(t));

    const stem = w => w.length > 4 ? w.replace(/[e]?s$|ing$|ed$|ly$|[e]$/i, '') : w;
    const regexTerms = rareTokens.map(stem).filter(w => w.length > 2).slice(0, 6).join('|');
    if (regexTerms) {
      orClauses.push({ text: { $regex: regexTerms, $options: 'i' } });
    }

    let filter = { project: this.projectName || 'default' };
    if (orClauses.length > 0) {
      filter.$or = orClauses;
    }

    const rawFallback = await chunksCollection.find(filter).limit(limit).toArray();

    const parentIds         = new Set();
    const parentMatchedChunk = {};
    const parentAllScores   = {};

    for (const doc of rawFallback) {
      const pidStr = doc.document_id.toString();
      parentIds.add(pidStr);
      if (!parentMatchedChunk[pidStr]) parentMatchedChunk[pidStr] = doc.text;
      if (!parentAllScores[pidStr]) parentAllScores[pidStr] = [];
      parentAllScores[pidStr].push({ text: doc.text, sectionTitle: doc.sectionTitle || '', score: 1.0, cosineScore: 1.0 });
    }

    const { ObjectId } = (await Promise.resolve(require('mongodb')));
    const parentObjectIds = Array.from(parentIds).slice(0, limit).map(id => new ObjectId(id));
      
    // Dynamically stitch full document text
    const allChunksDoc = await chunksCollection
      .find({ document_id: { $in: parentObjectIds } })
      .sort({ chunk_index: 1 })
      .project({ document_id: 1, text: 1 })
      .toArray();

    const docTextBuilder = {};
    for (const chk of allChunksDoc) {
      const d_id = chk.document_id.toString();
      if (!docTextBuilder[d_id]) docTextBuilder[d_id] = [];
      docTextBuilder[d_id].push(chk.text);
    }
    
    // Fetch parent document metadata 
    const parentDocs = await docsCollection.find({ _id: { $in: parentObjectIds } }).toArray();
    const docMetaMap = Object.fromEntries(parentDocs.map(d => [d._id.toString(), d]));
    
    return parentObjectIds.map(oid => {
      const pidStr = oid.toString();
      const meta = docMetaMap[pidStr] || {};
      
      return {
        contentId: oid,
        text:      (docTextBuilder[pidStr] || []).join(' '),
        tags:      meta.tags || [],
        score:     1.0,
        metadata:  {
          ...(meta || {}),
          matchedChunk:  parentMatchedChunk[pidStr] || '',
          sectionTitle:  '',
          allScores:     parentAllScores[pidStr] || [],
          fallback:      true,
          healedContext: true,
        },
      };
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  _waitForIndexReady()
  // ══════════════════════════════════════════════════════════════════════════

  async _waitForIndexReady(collection, indexName) {
    console.log(`ManasDB: Polling '${indexName}' index construction...`);
    let isReady = false;
    while (!isReady) {
      const indexes    = await collection.listSearchIndexes().toArray();
      const vectorIndex = indexes.find(idx => idx.name === indexName);
      if (vectorIndex && vectorIndex.status === 'READY') {
        console.log(`ManasDB: ${indexName} is READY.`);
        isReady = true;
      } else {
        const status = vectorIndex ? vectorIndex.status : 'INITIALIZING';
        process.stdout.write(`   [Status: ${status}] waiting...\r`);
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
  }

  /**
   * Closes the active database connection.
   */
  async close() {
    await MongoConnection.disconnect();
  }
}

export { ManasDB };
export default ManasDB;
