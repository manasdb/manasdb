import BaseProvider from './base.ts';
import type { InsertParams, VectorSearchParams } from './base.ts';
import MemoryEngine from '../core/memory-engine.js';
import crypto from 'crypto';

export interface MemoryDocument {
  id: string;
  text: string;
  hash: string;
  metadata?: any;
  project: string;
}

export interface MemoryVectorChunk {
  id: string;
  parentId: string;
  vector: number[];
  text: string;
  project: string;
}

/**
 * MemoryProvider — A zero-config in-memory storage driver for ManasDB.
 * Primarily used for development, testing, and rapid prototyping.
 */
export class MemoryProvider extends BaseProvider {
  public projectName: string;
  public debug: boolean;
  public documents: MemoryDocument[];
  public vectors: MemoryVectorChunk[];
  public MEMORY_LIMIT: number;
  private _manifest: any;

  constructor(uri?: string, dbName?: string, projectName?: string, debug = false) {
    super();
    this.projectName = projectName || 'default';
    this.debug = debug;
    this.documents = [];
    this.vectors = [];
    this.MEMORY_LIMIT = 5000;
  }

  async init(targetDims?: number): Promise<boolean> {
    if (this.debug) console.log(`[ManasDB] MemoryProvider initialized for project: ${this.projectName}`);
    return true;
  }

  /**
   * Persists a document and its vectors in-memory.
   */
  async insert({ rawText, filteredText, chunks = [], parentTags, aiProvider, targetDims }: InsertParams): Promise<any> {
    const contentHash = crypto.createHash('sha256').update(rawText).digest('hex');
    const existingDoc = this.documents.find(d => d.hash === contentHash && d.project === this.projectName);
    
    if (existingDoc) {
      if (this.debug) console.log(`[ManasDB] Duplicate content detected. Skipping vector generation for MemoryProvider.`);
      return { documentId: existingDoc.id, chunksInserted: 0, isDuplicate: true };
    }

    if (this.vectors.length > this.MEMORY_LIMIT) {
      process.emitWarning(
        `[ManasDB] MemoryProvider limit reached (${this.vectors.length} vectors). ` +
        `Performance will degrade and memory usage may become unstable. ` +
        `Switch to MongoDB or PostgreSQL for production loads.`,
        'ManasDBWarning'
      );
    }

    const documentId = Date.now().toString() + Math.random().toString(36).substring(7);
    
    this.documents.push({
      id: documentId,
      text: rawText,
      hash: contentHash,
      metadata: parentTags,
      project: this.projectName
    });

    for (const chunk of chunks) {
      const vectorRes = await aiProvider.embed(chunk.embedText);
      const vector = vectorRes.vector;
      this.vectors.push({
        id: Math.random().toString(36).substring(7),
        parentId: documentId,
        vector,
        text: chunk.text,
        project: this.projectName
      });
    }

    return { documentId, contentId: documentId, chunksInserted: chunks.length };
  }

  /**
   * Performs a brute-force memory scan for the nearest vectors.
   */
  async vectorSearch({ queryVector, limit = 10, minScore = 0, aiModelName }: VectorSearchParams): Promise<any[]> {
    const results = this.vectors
      .filter(v => v.project === this.projectName)
      .map(v => {
        const score = (MemoryEngine as any)._cosine(queryVector, v.vector);
        return {
          score: score,
          contentDetails: [{
            id: v.id,
            documentId: v.parentId,
            text: v.text
          }]
        };
      })
      .filter(r => r.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return results;
  }

  async delete(documentId: string | number): Promise<any> {
    const initialDocCount = this.documents.length;
    this.documents = this.documents.filter(d => d.id !== documentId || d.project !== this.projectName);
    this.vectors = this.vectors.filter(v => v.parentId !== documentId || v.project !== this.projectName);
    
    return { 
      deleted: initialDocCount > this.documents.length, 
      documentId 
    };
  }

  async updateManifest(manifest: any): Promise<void> {
    this._manifest = manifest;
  }

  async getMonthlySpend(): Promise<number> {
    return 0;
  }

  async clear(): Promise<boolean> {
    this.documents = this.documents.filter(d => d.project !== this.projectName);
    this.vectors = this.vectors.filter(v => v.project !== this.projectName);
    return true;
  }

  async health(): Promise<any> {
    return { status: 'ok', engine: 'in-memory', project: this.projectName };
  }

  async list(limit = 10): Promise<any[]> {
    return this.documents
      .filter(d => d.project === this.projectName)
      .slice(0, limit);
  }
}

export default MemoryProvider;
