import crypto from 'crypto';
import VectorNormalizer from '../utils/vector.js';
import BaseProvider from './base.ts';
import type { InsertParams, VectorSearchParams } from './base.ts';

function normalizeScore(score: number): number {
  if (typeof score !== 'number' || isNaN(score)) return 0;
  return Math.max(0, Math.min(1, score));
}

export class PostgresProvider extends BaseProvider {
  public uri: string;
  public dbName?: string;
  public projectName: string;
  public debug: boolean;
  public pool: any;

  constructor(uri: string, dbName?: string, projectName?: string, debug = false) {
    super();
    this.projectName = projectName || 'default';
    this.debug = debug;
    this.uri = uri;
    this.pool = null;
  }

  async init(targetDims?: number): Promise<void> {
    const { Pool } = await import('pg');
    this.pool = new Pool({ connectionString: this.uri });

    await this.pool.query('CREATE EXTENSION IF NOT EXISTS vector;');

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

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS _manas_vectors (
        id SERIAL PRIMARY KEY,
        chunk_id INTEGER REFERENCES _manas_chunks(id) ON DELETE CASCADE,
        project VARCHAR(255) NOT NULL,
        embedding_hash VARCHAR(64) NOT NULL,
        vec vector,
        magnitude NUMERIC,
        model VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

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

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS _manas_config (
        key VARCHAR(255) PRIMARY KEY,
        project VARCHAR(255) NOT NULL,
        data JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    try {
      await this.pool.query(`
        ALTER TABLE _manas_telemetry 
        ADD COLUMN IF NOT EXISTS retrieval_path VARCHAR(255),
        ADD COLUMN IF NOT EXISTS final_score NUMERIC,
        ADD COLUMN IF NOT EXISTS retrieval_mode VARCHAR(50),
        ADD COLUMN IF NOT EXISTS query_length_bucket VARCHAR(20),
        ADD COLUMN IF NOT EXISTS chunk_size_used INTEGER,
        ADD COLUMN IF NOT EXISTS embedding_profile VARCHAR(50),
        ADD COLUMN IF NOT EXISTS saved_by_cache NUMERIC,
        ADD COLUMN IF NOT EXISTS sdk_version VARCHAR(50),
        ADD COLUMN IF NOT EXISTS node_version VARCHAR(50);

      ALTER TABLE _manas_vectors ADD COLUMN IF NOT EXISTS magnitude NUMERIC;
      `);
    } catch(e) {}

    try { await this.pool.query(`ALTER TABLE _manas_vectors DROP CONSTRAINT IF EXISTS _manas_vectors_embedding_hash_key CASCADE;`); } catch(e) {}
    try { await this.pool.query(`ALTER TABLE manas_vectors DROP CONSTRAINT IF EXISTS manas_vectors_embedding_hash_key CASCADE;`); } catch(e) {}

    await this.pool.query(`CREATE INDEX IF NOT EXISTS idx_docs_hash_project ON _manas_documents(content_hash, project);`);
    await this.pool.query(`CREATE INDEX IF NOT EXISTS idx_vectors_embed_hash ON _manas_vectors(embedding_hash);`);
    await this.pool.query(`CREATE INDEX IF NOT EXISTS idx_telemetry_created_at ON _manas_telemetry(created_at);`);
    
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

  async insert({ rawText, filteredText, chunks = [], parentTags, aiProvider, targetDims }: InsertParams): Promise<any> {
    const client = await this.pool.connect();
    let isDeduplicated = false;
    let documentId: any;
    let vectorIds: any[] = [];

    try {
      await client.query('BEGIN');

      const parentHash = crypto.createHash('sha256').update(filteredText || rawText).digest('hex');
      
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

      for (const chunk of chunks) {
        if (!chunk.text.trim()) continue;

        const childHash = crypto.createHash('sha256').update(chunk.text).digest('hex');
        
        const insertChunk = await client.query(
          `INSERT INTO _manas_chunks (document_id, project, chunk_index, chunk_hash, text, section_title)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
          [documentId, this.projectName, chunk.chunkIndex, childHash, chunk.text, chunk.sectionTitle || '']
        );
        const chunkId = insertChunk.rows[0].id;

        const embeddingHash = crypto.createHash('sha256')
          .update(childHash + aiProvider.getModelKey() + targetDims)
          .digest('hex');

        const existingVec = await client.query(
          'SELECT id, vec::text FROM _manas_vectors WHERE embedding_hash = $1 LIMIT 1',
          [embeddingHash]
        );

        if (existingVec.rows.length > 0) {
          isDeduplicated = true;
          const insertVec = await client.query(
             `INSERT INTO _manas_vectors (chunk_id, project, embedding_hash, vec, model)
              VALUES ($1, $2, $3, $4, $5) RETURNING id`,
             [chunkId, this.projectName, embeddingHash, existingVec.rows[0].vec, aiProvider.getModelKey()]
          );
          vectorIds.push(insertVec.rows[0].id);
        } else {
          const { vector } = await aiProvider.embed(chunk.embedText, targetDims);
          const normalizedVector = VectorNormalizer.normalize(vector);
          const pgVectorString = `[${normalizedVector.join(',')}]`;

          const insertVec = await client.query(
             `INSERT INTO _manas_vectors (chunk_id, project, embedding_hash, vec, magnitude, model)
              VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
             [chunkId, this.projectName, embeddingHash, pgVectorString, 1.0, aiProvider.getModelKey()]
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

  async vectorSearch({ queryVector, limit = 10, minScore = 0, aiModelName, mode = 'qa', includeVector = false }: VectorSearchParams): Promise<any[]> {
    const normalizedQuery = VectorNormalizer.normalize(queryVector);
    const pgQueryVector = `[${normalizedQuery.join(',')}]`;

    const sql = `
      SELECT 
        v.id as vector_id,
        ${includeVector ? 'v.vec as vector,' : ''}
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
    
    let results = res.rows.map((row: any) => {
      const resObj: any = {
        database: 'postgres',
        chunk_id: row.vector_id,
        document_id: row.parent_id,
        score: normalizeScore(parseFloat(row.score)),
        contentDetails: [{
          text: row.chunk_text,
          sectionTitle: row.section_title,
          tags: row.tags
        }]
      };
      
      if (includeVector && row.vector) {
        resObj.vector = (typeof row.vector === 'string' && row.vector.startsWith('[')) 
             ? JSON.parse(row.vector) 
             : row.vector;
      }
      return resObj;
    });

    if (mode === 'document' && results.length > 0) {
      const parentIds = [...new Set(results.map((r: any) => r.document_id))];
      
      const siblingChunks = await this.pool.query(
        `SELECT document_id, text FROM _manas_chunks WHERE document_id = ANY($1) ORDER BY document_id, chunk_index ASC`,
        [parentIds]
      );

      const docBuilder: Record<string, string[]> = {};
      for (const row of siblingChunks.rows) {
        if (!docBuilder[row.document_id]) docBuilder[row.document_id] = [];
        docBuilder[row.document_id].push(row.text);
      }

      const uniqueDocs = new Map();
      for (const r of results) {
        if (!uniqueDocs.has(r.document_id) || r.score > uniqueDocs.get(r.document_id).score) {
          uniqueDocs.set(r.document_id, r);
        }
      }

      const healedResults = Array.from(uniqueDocs.values()).map((r: any) => {
        r.contentDetails[0].text = docBuilder[r.document_id].join(' ');
        return r;
      });

      return healedResults;
    }

    return results;
  }

  async delete(documentId: string | number): Promise<void> {
    if (!/^\d+$/.test(String(documentId))) {
      if (this.debug) console.log(`[PostgresProvider] Ignore delete for non-integer id: ${documentId}`);
      return;
    }
    await this.pool.query('DELETE FROM _manas_documents WHERE id = $1 AND project = $2', [documentId, this.projectName]);
  }

  async deleteMany(query: Record<string, any>): Promise<number | undefined> {
    if (!query || Object.keys(query).length === 0) return 0;
    
    const conditions: string[] = [];
    const values: any[] = [this.projectName];
    let i = 2;
    for (const [k, v] of Object.entries(query)) {
      conditions.push(`tags->>'${k}' = $${i}`);
      values.push(String(v));
      i++;
    }
    
    if (conditions.length === 0) return 0;
    const whereClause = conditions.join(' AND ');
    
    const res = await this.pool.query(
      `DELETE FROM _manas_documents WHERE project = $1 AND ${whereClause}`,
      values
    );
    return res.rowCount;
  }

  async clear(): Promise<void> {
    await this.pool.query('DELETE FROM _manas_documents WHERE project = $1', [this.projectName]);
  }

  async clearTelemetry(): Promise<void> {
    await this.pool.query('TRUNCATE _manas_telemetry CASCADE;');
  }

  async health(): Promise<boolean> {
    const res = await this.pool.query('SELECT 1');
    return res.rowCount === 1;
  }

  async logTelemetry(telemetryDoc: Record<string, any>): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO _manas_telemetry (
           event_name, project, duration_ms, financial, metadata, 
           retrieval_path, final_score, retrieval_mode, query_length_bucket, 
           chunk_size_used, embedding_profile, saved_by_cache, sdk_version, node_version
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          telemetryDoc.eventName,
          telemetryDoc.projectName,
          telemetryDoc.durationMs,
          JSON.stringify(telemetryDoc.financial || {}),
          JSON.stringify(telemetryDoc.metadata || {}),
          telemetryDoc.retrievalPath,
          telemetryDoc.finalScore,
          telemetryDoc.retrievalMode,
          telemetryDoc.queryLengthBucket,
          telemetryDoc.chunkSizeUsed,
          telemetryDoc.embeddingProfile,
          telemetryDoc.savedByCache,
          telemetryDoc.sdkVersion,
          telemetryDoc.nodeVersion
        ]
      );
    } catch (e) {}
  }

  async getManifest(): Promise<any> {
    const res = await this.pool.query(
      "SELECT data FROM _manas_config WHERE key = 'manifest' AND project = $1 LIMIT 1",
      [this.projectName]
    );
    return res.rows.length > 0 ? res.rows[0].data : null;
  }

  async updateManifest(manifest: any): Promise<void> {
    await this.pool.query(
      `INSERT INTO _manas_config (key, project, data, updated_at)
       VALUES ('manifest', $1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (key) DO UPDATE SET data = $2, updated_at = CURRENT_TIMESTAMP`,
      [this.projectName, JSON.stringify(manifest)]
    );
  }

  async expireOlderThan(date: Date): Promise<number> {
    const res = await this.pool.query(
      'DELETE FROM _manas_documents WHERE project = $1 AND created_at < $2',
      [this.projectName, date]
    );
    return res.rowCount;
  }

  async getMonthlySpend(): Promise<number> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const res = await this.pool.query(
      `SELECT SUM((financial->>'actual_cost')::numeric) as total
       FROM _manas_telemetry 
       WHERE project = $1 AND created_at >= $2`,
      [this.projectName, startOfMonth]
    );
    
    return parseFloat(res.rows[0].total || 0);
  }
}

export default PostgresProvider;
