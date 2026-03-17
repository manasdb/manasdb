import crypto from 'crypto';
import MongoConnection from '../core/connection.js';
import MemoryEngine from '../core/memory-engine.js';
import CostCalculator from '../utils/CostCalculator.js';
import Telemetry from '../utils/Telemetry.js';
import VectorNormalizer from '../utils/vector.js';
import BaseProvider from './base.js';

/**
 * Normalizes a similarity score to the [0, 1] range.
 * MongoDB Atlas $vectorSearch already returns [0,1] cosine scores.
 * The local fallback uses raw _cosine() which can return [-1,1] — clamp it.
 * @param {number} score
 * @returns {number}
 */
function normalizeScore(score) {
  if (typeof score !== 'number' || isNaN(score)) return 0;
  return Math.max(0, Math.min(1, score));
}

class MongoProvider extends BaseProvider {
  constructor(uri, dbName, projectName, debug = false) {
    super();
    this.uri = uri;
    this.dbName = dbName;
    this.projectName = projectName || 'default';
    this.debug = debug === true;
    
    // In universal config, caching usually lives in the core orchestrator,
    // but we can preserve basic Mongo specifics here if needed.
  }

  async init(targetDims) {
    await MongoConnection.connect(this.uri, this.dbName);
    await MongoConnection.validateEnvironment();

    const db = MongoConnection.getDb();
    const vectorsCollection = db.collection('_manas_vectors');
    const chunksCollection  = db.collection('_manas_chunks');
    const docsCollection    = db.collection('_manas_documents');

    try { await docsCollection.createIndex({ content_hash: 1, project: 1 }); } catch (_) {}
    try {
      await chunksCollection.createIndex(
        { text: 'text', 'tags.keywords': 'text' },
        { name: 'text_search_index', default_language: 'english' }
      );
    } catch (_) {}
    try { await chunksCollection.createIndex({ document_id: 1, chunk_index: 1 }); } catch (_) {}
    try { await vectorsCollection.createIndex({ embedding_hash: 1 }); } catch (_) {}
    try {
      await db.collection('_manas_telemetry').createIndex(
        { timestamp: 1 },
        { expireAfterSeconds: 63072000, background: true }
      );
    } catch (_) {}

    try {
      const existingIndexes = await vectorsCollection.listSearchIndexes().toArray();
      const indexName  = `vector_index_${targetDims}`; 
      const vectorIndex = existingIndexes.find(idx => idx.name === indexName);

      if (!vectorIndex) {
        if (this.debug) console.log(`ManasDB: Creating MongoDB vector index ${indexName}...`);
        await vectorsCollection.createSearchIndex({
          name: indexName,
          type: 'vectorSearch',
          definition: {
            fields: [
              { type: 'vector', path: 'vector', numDimensions: targetDims, similarity: 'cosine' },
              { type: 'filter', path: 'model' },
              { type: 'filter', path: 'profile' }
            ]
          }
        });
      }
    } catch (error) {
      if (error.codeName !== 'CommandNotFound') {
        if (this.debug) console.warn('️ MANASDB_WARNING: Failed to verify/create Mongo vector index.', error.message);
      }
    }

    if (this.debug) console.log(`MongoProvider initialized for project: ${this.projectName}`);
  }

  async insert({ rawText, filteredText, chunks, parentTags, aiProvider, targetDims }) {
    const db = MongoConnection.getDb();
    const chunksCollection  = db.collection('_manas_chunks');
    const docsCollection    = db.collection('_manas_documents');
    const vectorsCollection = db.collection('_manas_vectors');

    let isDeduplicated = false;
    
    const parent_hash = crypto.createHash('sha256').update(filteredText).digest('hex');
    let parentDoc = await docsCollection.findOne({
      content_hash: parent_hash,
      project: this.projectName,
    });
    
    let document_id;
    if (parentDoc) {
      document_id = parentDoc._id;
    } else {
      const parentResult = await docsCollection.insertOne({
        tags: parentTags, 
        content_hash: parent_hash,
        chunk_count: chunks.length,
        project: this.projectName,
        createdAt: new Date()
      });
      document_id = parentResult.insertedId;
    }

    const vectorIds = [];

    for (const chunk of chunks) {
      if (!chunk.text.trim()) continue;

      const child_hash = crypto.createHash('sha256').update(chunk.text).digest('hex');
      let childDoc = await chunksCollection.findOne({
        chunk_hash: child_hash,
        project: this.projectName,
      });
      let chunk_id;

      if (childDoc) {
        chunk_id = childDoc._id;
      } else {
        const childTags = MemoryEngine.extractTags(chunk.text);
        const childResult = await chunksCollection.insertOne({
          document_id:   document_id,
          chunk_index:   chunk.chunkIndex,
          chunk_hash:    child_hash,
          text:          chunk.text,
          embedText:     chunk.embedText,
          sectionTitle:  chunk.sectionTitle,
          totalInSection: chunk.totalInSection,
          tags:          childTags,
          project:       this.projectName,
          createdAt:     new Date()
        });
        chunk_id = childResult.insertedId;
      }

      const embedding_hash = crypto.createHash('sha256')
        .update(child_hash + aiProvider.getModelKey() + targetDims)
        .digest('hex');

      let vectorDoc = await vectorsCollection.findOne({ embedding_hash }, { projection: { _id: 1 } });
      
      if (vectorDoc) {
        vectorIds.push(vectorDoc._id);
        isDeduplicated = true;
      } else {
        const { vector, dims, model, originalDims } = await aiProvider.embed(chunk.embedText, targetDims);
        const normalizedVector = VectorNormalizer.normalize(vector);
        
        const upsertResult = await vectorsCollection.findOneAndUpdate(
          { embedding_hash },
          { $setOnInsert: {
              chunk_id, document_id, model, dims, profile: 'balanced', originalDims,
              precision: 'float32', 
              vector: normalizedVector, 
              vector_full: normalizedVector, 
              magnitude: 1.0,
              embedding_hash,
              createdAt: new Date(),
            }
          },
          { upsert: true, returnDocument: 'after', projection: { _id: 1 } }
        );
        vectorIds.push(upsertResult._id);
      }
    }

    return { database: 'mongodb', contentId: document_id, vectorIds, chunksInserted: chunks.length, isDeduplicated };
  }

  async vectorSearch({ queryVector, limit, minScore, aiModelName, mode = 'qa', includeVector = false }) {
    const db = MongoConnection.getDb();
    const vectorsCollection = db.collection('_manas_vectors');
    const chunksCollection  = db.collection('_manas_chunks');

    const indexName  = `vector_index_${queryVector.length}`;

      const projectStage = {
        _id: 1, chunk_id: 1, document_id: 1,
        annScore: { $meta: 'vectorSearchScore' },
      };
      if (includeVector) projectStage.vector = 1;

      const annPipeline = [
        {
          $vectorSearch: {
            index: indexName,
            path:  'vector',
            queryVector: VectorNormalizer.normalize(queryVector),
            numCandidates: limit * 10,
            limit: limit * 2,
            filter: { model: aiModelName },
          },
        },
        {
          $project: projectStage,
        },
        {
          $lookup: {
            from:         '_manas_chunks',
            localField:   'chunk_id',
            foreignField: '_id',
            as:           'contentDetails',
          },
        },
      ];

    let annRaw = await vectorsCollection.aggregate(annPipeline).toArray();

    // Context-Healer: joining chunks onto parents
    const parentBestScore = {};
    const parentMatchedChunk = {};
    const parentIds = new Set();
    const targetProject = this.projectName;

    let filteredRaw = annRaw.filter(res => {
      const child = res.contentDetails?.[0];
      if (!child) return false;
      if (child.project && child.project !== targetProject) return false;
      return true;
    });

    // FALLBACK: Atlas asynchronous indexes often take >10 seconds to sync.
    // If the active project index yields nothing, fetch bounded vectors locally and compute exactly.
    if (filteredRaw.length === 0) {
      const crypto = await import('crypto');
      const projectChunks = await chunksCollection.find({ project: targetProject }).limit(limit * 20).toArray();
      
      const embeddingHashes = projectChunks.map(c => {
        return crypto.createHash('sha256').update(c.chunk_hash + aiModelName + queryVector.length).digest('hex');
      });
      
      const fallbackVectors = await vectorsCollection.find({ embedding_hash: { $in: embeddingHashes } }).toArray();
      const MemoryEngine = (await import('../core/memory-engine.js')).default;
      
      annRaw = fallbackVectors.map(fv => {
        let vec = fv.vector_full || fv.vector;
        if (typeof vec === 'object' && vec.buffer) vec = Array.from(vec);
        const annScore = MemoryEngine._cosine(queryVector, vec);
        const resObj = {
          _id: fv._id,
          chunk_id: fv.chunk_id, // old legacy chunk
          document_id: fv.document_id,
          embedding_hash: fv.embedding_hash,
          annScore
        };
        if (includeVector) resObj.vector = vec; // Provide vector for MMR fallback
        return resObj;
      }).filter(r => r.annScore >= minScore);
      
      annRaw.sort((a,b) => b.annScore - a.annScore);
      annRaw = annRaw.slice(0, limit * 2);

      for (const r of annRaw) {
        const cDoc = projectChunks.find(c => {
          const h = crypto.createHash('sha256').update(c.chunk_hash + aiModelName + queryVector.length).digest('hex');
          return h === r.embedding_hash;
        });
        r.contentDetails = cDoc ? [cDoc] : [];
        if (cDoc) r.document_id = cDoc.document_id;
      }
      
      filteredRaw = annRaw.filter(res => res.contentDetails?.[0]);
    }

    if (mode === 'qa') {
      // Fast path: Just return exact matched chunk (no Context Healing join)
      return filteredRaw.map(res => {
        const child = res.contentDetails[0];
        const resObj = {
          database: 'mongodb',
          chunk_id: child._id,
          document_id: child.document_id,
          score: normalizeScore(res.annScore || res.score),
          contentDetails: [{
            text: child.text,
            sectionTitle: child.sectionTitle || '',
            tags: child.tags || []
          }]
        };
        if (includeVector && res.vector) resObj.vector = Array.from(res.vector);
        return resObj;
      }).sort((a, b) => b.score - a.score).slice(0, limit);
    }

    // mode === 'document': Full Context-Healer Join
    for (const res of filteredRaw) {
      const child = res.contentDetails[0];
      const pidStr = child.document_id.toString();
      parentIds.add(pidStr);

      if (!parentBestScore[pidStr] || res.annScore > parentBestScore[pidStr]) {
        parentBestScore[pidStr] = res.annScore;
        parentMatchedChunk[pidStr] = child;
      }
    }

    const { ObjectId } = await import('mongodb');
    const parentObjectIds = Array.from(parentIds).map(id => {
      try { return new ObjectId(id); } catch(e) { return id; }
    });
    
    if (parentObjectIds.length === 0) return [];

    const allChunksDoc = await chunksCollection
      .find({ document_id: { $in: parentObjectIds } })
      .sort({ chunk_index: 1 })
      .toArray();

    const docTextBuilder = {};
    const docTagsBuilder = {};
    for (const chk of allChunksDoc) {
      const d_id = chk.document_id.toString();
      if (!docTextBuilder[d_id]) docTextBuilder[d_id] = [];
      docTextBuilder[d_id].push(chk.text);
      if (chk.tags && !docTagsBuilder[d_id]) docTagsBuilder[d_id] = chk.tags;
    }

    const healedParents = parentObjectIds.map(oid => {
      const d_id = oid.toString();
      const finalDoc = {
        database: 'mongodb',
        chunk_id: matched._id,
        document_id: oid,
        // Normalize to [0,1] — Atlas scores are already in range, fallback cosine can be [-1,1]
        score: normalizeScore(parentBestScore[d_id] || 0),
        contentDetails: [{
          text: (docTextBuilder[d_id] || []).join(' '),
          sectionTitle: matched.sectionTitle || '',
          tags: docTagsBuilder[d_id] || matched.tags || []
        }]
      };
      if (includeVector && matched.vector) finalDoc.vector = Array.from(matched.vector);
      return finalDoc;
    });

    healedParents.sort((a, b) => b.score - a.score);
    return healedParents.slice(0, limit);
  }

  /**
   * Performs a keyword-based text search.
   * Leverages MongoDB's $text index for rapid retrieval of exact matches.
   */
  async keywordSearch({ query, limit, mode = 'qa' }) {
    const db = MongoConnection.getDb();
    const chunksCollection = db.collection('_manas_chunks');

    // MongoDB $text search returns scores based on keyword density
    const pipeline = [
      { 
        $match: { 
          $text: { $search: query },
          project: this.projectName 
        } 
      },
      { 
        $project: { 
          _id: 1, 
          document_id: 1, 
          text: 1, 
          sectionTitle: 1, 
          tags: 1,
          score: { $meta: "textScore" } 
        } 
      },
      { $sort: { score: { $meta: "textScore" } } },
      { $limit: limit * (mode === 'document' ? 5 : 1) } // Fetch more if we need to aggregate
    ];

    const results = await chunksCollection.aggregate(pipeline).toArray();

    if (mode === 'qa') {
      return results.map(res => ({
        database: 'mongodb',
        chunk_id: res._id,
        document_id: res.document_id,
        score: normalizeScore(res.score / 10),
        contentDetails: [{
          text: res.text,
          sectionTitle: res.sectionTitle || '',
          tags: res.tags || []
        }]
      }));
    }

    // mode === 'document': Club chunks together by document_id
    const parentIds = [...new Set(results.map(r => r.document_id.toString()))];
    if (parentIds.length === 0) return [];

    const { ObjectId } = await import('mongodb');
    const parentObjectIds = parentIds.map(id => {
      try { return new ObjectId(id); } catch(e) { return id; }
    });

    const allChunks = await chunksCollection
      .find({ document_id: { $in: parentObjectIds } })
      .sort({ chunk_index: 1 })
      .toArray();

    const docGroups = {};
    for (const chunk of allChunks) {
      const pid = chunk.document_id.toString();
      if (!docGroups[pid]) docGroups[pid] = { chunks: [], tags: [] };
      docGroups[pid].chunks.push(chunk.text);
      if (chunk.tags) {
        const t = Array.isArray(chunk.tags) ? chunk.tags : (chunk.tags.keywords || []);
        docGroups[pid].tags.push(...t);
      }
    }

    return parentObjectIds.map(oid => {
      const pid = oid.toString();
      const matchedRes = results.find(r => r.document_id.toString() === pid);
      if (!matchedRes) return null;

      return {
        database: 'mongodb',
        chunk_id: matchedRes._id,
        document_id: oid,
        score: normalizeScore(matchedRes.score / 10),
        contentDetails: [{
          text: (docGroups[pid]?.chunks || []).join(' '),
          sectionTitle: matchedRes.sectionTitle || '',
          tags: [...new Set(docGroups[pid]?.tags || [])]
        }]
      };
    }).filter(Boolean).sort((a, b) => b.score - a.score).slice(0, limit);
  }

  async delete(documentId) {
    const db = MongoConnection.getDb();
    const { ObjectId } = await import('mongodb');
    const id = typeof documentId === 'string' ? new ObjectId(documentId) : documentId;
    
    await db.collection('_manas_vectors').deleteMany({ document_id: id });
    await db.collection('_manas_chunks').deleteMany({ document_id: id });
    await db.collection('_manas_documents').deleteOne({ _id: id });
  }

  async deleteMany(query) {
    if (!query || Object.keys(query).length === 0) return;
    const db = MongoConnection.getDb();
    
    // Convert { userId: "123" } -> { "tags.userId": "123", project: "default" }
    // Map tag query to mongo format: { "tags.key": "val" }
    const mongoQuery = { project: this.projectName };
    for (const [k, v] of Object.entries(query)) {
      mongoQuery[`tags.${k}`] = v;
    }
    
    const docs = await db.collection('_manas_documents').find(mongoQuery, { projection: { _id: 1 } }).toArray();
    const docIds = docs.map(d => d._id);
    
    if (docIds.length > 0) {
      await db.collection('_manas_vectors').deleteMany({ document_id: { $in: docIds } });
      await db.collection('_manas_chunks').deleteMany({ document_id: { $in: docIds } });
      const res = await db.collection('_manas_documents').deleteMany({ _id: { $in: docIds } });
      return res.deletedCount;
    }
    return 0;
  }

  async clearAll() {
    const db = MongoConnection.getDb();
    if (!db) return { deletedTotal: 0 };
    const chunksRes = await db.collection('_manas_chunks').deleteMany({ project: this.projectName });
    const vectorRes = await db.collection('_manas_vectors').deleteMany({ project: this.projectName });
    const docsRes   = await db.collection('_manas_documents').deleteMany({ project: this.projectName });
    return {
      deletedTotal: (chunksRes.deletedCount || 0) + (vectorRes.deletedCount || 0) + (docsRes.deletedCount || 0)
    };
  }

  /**
   * Retrieves the project manifest (model info).
   */
  async getManifest() {
    const db = MongoConnection.getDb();
    if (!db) return null;
    return await db.collection('_manas_config').findOne({ key: 'manifest', project: this.projectName });
  }

  /**
   * Updates the project manifest.
   */
  async updateManifest(manifest) {
    const db = MongoConnection.getDb();
    if (!db) return;
    await db.collection('_manas_config').updateOne(
      { key: 'manifest', project: this.projectName },
      { $set: { ...manifest, updatedAt: new Date() } },
      { upsert: true }
    );
  }

  /**
   * Bulk deletes memories older than a specific date.
   */
  async expireOlderThan(date) {
    const db = MongoConnection.getDb();
    if (!db) return 0;
    
    // Postgres cascades, but Mongo needs manual cascading across collections
    const docs = await db.collection('_manas_documents').find({
      project: this.projectName,
      createdAt: { $lt: date }
    }).toArray();
    
    if (docs.length === 0) return 0;
    const docIds = docs.map(d => d._id);
    
    await db.collection('_manas_chunks').deleteMany({ document_id: { $in: docIds } });
    await db.collection('_manas_vectors').deleteMany({ chunk_id: { $in: docIds } }); // approximation if chunk_id is used
    return res.deletedCount;
  }

  /**
   * Calculates total spend for the current project in the current month.
   */
  async getMonthlySpend() {
    const db = MongoConnection.getDb();
    if (!db) return 0;
    
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0,0,0,0);
    
    const pipeline = [
      { $match: { 
          project: this.projectName,
          timestamp: { $gte: startOfMonth }
      }},
      { $group: {
          _id: null,
          totalSpend: { $sum: "$financial.actual_cost" }
      }}
    ];
    
    const result = await db.collection('_manas_telemetry').aggregate(pipeline).toArray();
    return result.length > 0 ? result[0].totalSpend : 0;
  }

  async clear() {
    const db = MongoConnection.getDb();
    await db.collection('_manas_vectors').deleteMany({});
    await db.collection('_manas_chunks').deleteMany({});
    await db.collection('_manas_documents').deleteMany({});
  }

  async clearTelemetry() {
    const db = MongoConnection.getDb();
    await db.collection('_manas_telemetry').deleteMany({});
  }

  async health() {
    const db = MongoConnection.getDb();
    const res = await db.command({ ping: 1 });
    return res.ok === 1;
  }

  async logTelemetry(telemetryDoc) {
    try {
      const db = MongoConnection.getDb();
      if (!db) return;
      const telemetryCollection = db.collection('_manas_telemetry');
      telemetryCollection.insertOne(telemetryDoc).catch(() => {});
    } catch(e) {}
  }

  async list(limit = 10) {
    const db = MongoConnection.getDb();
    const docs = await db.collection('_manas_documents')
      .find({ project: this.projectName })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    return docs.map(d => ({
      contentId: d._id,
      text: d.rawText || "", // We might need to handle context reconstruction if rawText is missing
      createdAt: d.createdAt,
      project: d.project
    }));
  }

  async close() {
    await MongoConnection.disconnect();
    if (this.debug) console.log(`[MongoProvider] Connection closed.`);
  }
}

export default MongoProvider;
