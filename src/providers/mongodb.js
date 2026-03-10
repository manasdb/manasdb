import crypto from 'crypto';
import MongoConnection from '../core/connection.js';
import MemoryEngine from '../core/memory-engine.js';
import CostCalculator from '../utils/CostCalculator.js';
import Telemetry from '../utils/Telemetry.js';
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

  async init(targetDims = 1536) {
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
        
        const upsertResult = await vectorsCollection.findOneAndUpdate(
          { embedding_hash },
          { $setOnInsert: {
              chunk_id, document_id, model, dims, profile: 'balanced', originalDims,
              precision: 'float32', vector, vector_full: vector, embedding_hash,
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

  async vectorSearch({ queryVector, limit, minScore, aiModelName, mode = 'qa' }) {
    const db = MongoConnection.getDb();
    const vectorsCollection = db.collection('_manas_vectors');
    const chunksCollection  = db.collection('_manas_chunks');

    const indexName  = `vector_index_${queryVector.length}`;

    // A simplified Atlas vector search returning chunks.
    const annPipeline = [
      {
        $vectorSearch: {
          index: indexName,
          path:  'vector',
          queryVector,
          numCandidates: limit * 10,
          limit: limit * 2,
          filter: { model: aiModelName },
        },
      },
      {
        $project: {
          _id: 1, chunk_id: 1, document_id: 1,
          annScore: { $meta: 'vectorSearchScore' },
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
        return {
          _id: fv._id,
          chunk_id: fv.chunk_id, // old legacy chunk
          document_id: fv.document_id,
          embedding_hash: fv.embedding_hash,
          annScore
        };
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
        return {
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
      const matched = parentMatchedChunk[d_id] || {};
      return {
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
    });

    healedParents.sort((a, b) => b.score - a.score);
    return healedParents.slice(0, limit);
  }

  async delete(documentId) {
    const db = MongoConnection.getDb();
    const { ObjectId } = await import('mongodb');
    const id = typeof documentId === 'string' ? new ObjectId(documentId) : documentId;
    
    await db.collection('_manas_vectors').deleteMany({ document_id: id });
    await db.collection('_manas_chunks').deleteMany({ document_id: id });
    await db.collection('_manas_documents').deleteOne({ _id: id });
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
  async close() {
    await MongoConnection.disconnect();
    if (this.debug) console.log(`[MongoProvider] Connection closed.`);
  }
}

export default MongoProvider;
