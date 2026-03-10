import crypto from 'crypto';
import BaseProvider from './base.js';

/**
 * Normalizes a pgvector similarity score to the [0, 1] range.
 * pgvector <=>'s (1 - cosine_distance) is theoretically [-1,1].
 * For unit-normalized embeddings it stays [0,1] but we clamp defensively.
 * @param {number} score
 * @returns {number}
 */
function normalizeScore(score) {
  if (typeof score !== 'number' || isNaN(score)) return 0;
  return Math.max(0, Math.min(1, score));
}

class PostgresProvider extends BaseProvider {
  constructor(uri, dbName, projectName, debug = false) {
    super();
    this.projectName = projectName || 'default';
    this.debug = debug;
    this.uri = uri;
    this.pool = null;
  }

  async init() {
    const { Pool } = await import('pg');
    this.pool = new Pool({ connectionString: this.uri });

    // 1. Ensure pgvector extension exists
    await this.pool.query('CREATE EXTENSION IF NOT EXISTS vector;');

    // 2. Create _manas_documents (Context-Healer parent documents)
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS _manas_documents (
        id SERIAL PRIMARY KEY,
        project VARCHAR(255) NOT NULL,
        content_hash VARCHAR(64) NOT NULL,
        chunk_count INTEGER NOT NULL,
        tags JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Create _manas_chunks (Text content separated from Vectors for exact MongoDB parity)
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS _manas_chunks (
        id SERIAL PRIMARY KEY,
        document_id INTEGER REFERENCES _manas_documents(id) ON DELETE CASCADE,
        project VARCHAR(255) NOT NULL,
        chunk_index INTEGER NOT NULL,
        chunk_hash VARCHAR(64) NOT NULL,
        text TEXT NOT NULL,
        section_title TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. Create _manas_vectors (Child embeddings with pgvector)
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS _manas_vectors (
        id SERIAL PRIMARY KEY,
        chunk_id INTEGER REFERENCES _manas_chunks(id) ON DELETE CASCADE,
        project VARCHAR(255) NOT NULL,
        embedding_hash VARCHAR(64) NOT NULL,
        vec vector, -- Dynamically accept any dimension natively
        model VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 5. Create _manas_telemetry
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS _manas_telemetry (
        id SERIAL PRIMARY KEY,
        event_name VARCHAR(255) NOT NULL,
        project VARCHAR(255) NOT NULL,
        duration_ms NUMERIC,
        financial JSONB,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Ensure UNIQUE constraint is dropped if it existed from previous runs (legacy cleanup)
    try { await this.pool.query(`ALTER TABLE _manas_vectors DROP CONSTRAINT IF EXISTS _manas_vectors_embedding_hash_key CASCADE;`); } catch(e) {}
    try { await this.pool.query(`ALTER TABLE manas_vectors DROP CONSTRAINT IF EXISTS manas_vectors_embedding_hash_key CASCADE;`); } catch(e) {}

    // Indexes for Deduplication (ROI) and Sparse Retrieval Filtering
    await this.pool.query(`CREATE INDEX IF NOT EXISTS idx_docs_hash_project ON _manas_documents(content_hash, project);`);
    await this.pool.query(`CREATE INDEX IF NOT EXISTS idx_vectors_embed_hash ON _manas_vectors(embedding_hash);`);
    
    // HNSW Vector Index for Cosine Distance (<=>)
    try {
      await this.pool.query(`
        CREATE INDEX IF NOT EXISTS idx_vectors_hnsw ON _manas_vectors 
        USING hnsw (vec vector_cosine_ops);
      `);
    } catch (e) {
      if (this.debug) console.warn('Could not create Postgres HNSW index immediately.');
    }

    if (this.debug) console.log(`PostgresProvider initialized for project: ${this.projectName}`);
  }

  async insert({ rawText, filteredText, chunks, parentTags, aiProvider, targetDims }) {
    const client = await this.pool.connect();
    let isDeduplicated = false;
    let documentId;
    let vectorIds = [];

    try {
      await client.query('BEGIN');

      // ── Step 1: Parent document ────
      const parentHash = crypto.createHash('sha256').update(filteredText).digest('hex');
      
      const existingParent = await client.query(
        'SELECT id FROM _manas_documents WHERE content_hash = $1 AND project = $2 LIMIT 1',
        [parentHash, this.projectName]
      );

      if (existingParent.rows.length > 0) {
        documentId = existingParent.rows[0].id;
      } else {
        const insertParent = await client.query(
          `INSERT INTO _manas_documents (project, content_hash, chunk_count, tags) 
           VALUES ($1, $2, $3, $4) RETURNING id`,
          [this.projectName, parentHash, chunks.length, JSON.stringify(parentTags)]
        );
        documentId = insertParent.rows[0].id;
      }

      // ── Step 2: Chunks and Vectors ────
      for (const chunk of chunks) {
        if (!chunk.text.trim()) continue;

        const childHash = crypto.createHash('sha256').update(chunk.text).digest('hex');
        
        // Always insert the text chunk
        const insertChunk = await client.query(
          `INSERT INTO _manas_chunks (document_id, project, chunk_index, chunk_hash, text, section_title)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
          [documentId, this.projectName, chunk.chunkIndex, childHash, chunk.text, chunk.sectionTitle || '']
        );
        const chunkId = insertChunk.rows[0].id;

        const embeddingHash = crypto.createHash('sha256')
          .update(childHash + aiProvider.getModelKey() + targetDims)
          .digest('hex');

        // Check deduplication (ROI financial shield)
        const existingVec = await client.query(
          'SELECT id, vec::text FROM _manas_vectors WHERE embedding_hash = $1 LIMIT 1',
          [embeddingHash]
        );

        if (existingVec.rows.length > 0) {
          isDeduplicated = true;
          // Copy the existing vector to the new project's chunk, saving LLM cost!
          const insertVec = await client.query(
             `INSERT INTO _manas_vectors (chunk_id, project, embedding_hash, vec, model)
              VALUES ($1, $2, $3, $4, $5) RETURNING id`,
             [chunkId, this.projectName, embeddingHash, existingVec.rows[0].vec, aiProvider.getModelKey()]
          );
          vectorIds.push(insertVec.rows[0].id);
        } else {
          // Generate Vector dynamically before routing down
          const { vector } = await aiProvider.embed(chunk.embedText, targetDims);
          
          // Format vector for pgvector: '[0.1, 0.2, 0.3]'
          const pgVectorString = `[${vector.join(',')}]`;

          const insertVec = await client.query(
             `INSERT INTO _manas_vectors (chunk_id, project, embedding_hash, vec, model)
              VALUES ($1, $2, $3, $4, $5) RETURNING id`,
             [chunkId, this.projectName, embeddingHash, pgVectorString, aiProvider.getModelKey()]
          );
          vectorIds.push(insertVec.rows[0].id);
        }
      }

      await client.query('COMMIT');
      return { database: 'postgres', contentId: documentId, vectorIds, chunksInserted: chunks.length, isDeduplicated };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async vectorSearch({ queryVector, limit, minScore, aiModelName, mode = 'qa' }) {
    const pgQueryVector = `[${queryVector.join(',')}]`;

    // ── Context-Healer JOIN across the 3 new matching tables ────
    const sql = `
      SELECT 
        v.id as vector_id,
        c.text as chunk_text,
        c.section_title as section_title,
        p.id as parent_id,
        p.tags,
        (1 - (v.vec <=> $1::vector)) as score
      FROM _manas_vectors v
      JOIN _manas_chunks c ON v.chunk_id = c.id
      JOIN _manas_documents p ON c.document_id = p.id
      WHERE v.project = $2 
        AND v.model = $3
        AND (1 - (v.vec <=> $1::vector)) >= $4
      ORDER BY v.vec <=> $1::vector ASC
      LIMIT $5;
    `;

    const res = await this.pool.query(sql, [pgQueryVector, this.projectName, aiModelName, minScore, limit]);
    
    // Normalize mapping so the SDK core receives unified JSON.
    // normalizeScore clamps to [0,1] for safe polyglot score merging.
    let results = res.rows.map(row => ({
      database: 'postgres',
      chunk_id: row.vector_id,
      document_id: row.parent_id,
      score: normalizeScore(parseFloat(row.score)),
      contentDetails: [{
        text: row.chunk_text,
        sectionTitle: row.section_title,
        tags: row.tags
      }]
    }));

    if (mode === 'document' && results.length > 0) {
      // Context-Healer: Join all chunks for the top parent documents
      const parentIds = [...new Set(results.map(r => r.document_id))];
      
      const siblingChunks = await this.pool.query(
        `SELECT document_id, text FROM _manas_chunks WHERE document_id = ANY($1) ORDER BY document_id, chunk_index ASC`,
        [parentIds]
      );

      // Reconstruct full textual documents
      const docBuilder = {};
      for (const row of siblingChunks.rows) {
        if (!docBuilder[row.document_id]) docBuilder[row.document_id] = [];
        docBuilder[row.document_id].push(row.text);
      }

      // Deduplicate results by document_id (since multiple chunks from same doc might hit)
      const uniqueDocs = new Map();
      for (const r of results) {
        if (!uniqueDocs.has(r.document_id) || r.score > uniqueDocs.get(r.document_id).score) {
          uniqueDocs.set(r.document_id, r);
        }
      }

      const healedResults = Array.from(uniqueDocs.values()).map(r => {
        r.contentDetails[0].text = docBuilder[r.document_id].join(' ');
        return r;
      });

      return healedResults;
    }

    return results;
  }

  async delete(documentId) {
    if (!/^\d+$/.test(String(documentId))) {
      if (this.debug) console.log(`[PostgresProvider] Ignore delete for non-integer id: ${documentId}`);
      return;
    }
    await this.pool.query('DELETE FROM _manas_documents WHERE id = $1 AND project = $2', [documentId, this.projectName]);
  }

  async health() {
    const res = await this.pool.query('SELECT 1');
    return res.rowCount === 1;
  }

  async logTelemetry(telemetryDoc) {
    try {
      await this.pool.query(
        `INSERT INTO _manas_telemetry (event_name, project, duration_ms, financial, metadata)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          telemetryDoc.eventName,
          telemetryDoc.projectName,
          telemetryDoc.durationMs,
          JSON.stringify(telemetryDoc.financial || {}),
          JSON.stringify(telemetryDoc.metadata || {})
        ]
      );
    } catch (e) {}
  }
}

export default PostgresProvider;
