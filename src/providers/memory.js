import BaseProvider from './base.js';
import MemoryEngine from '../core/memory-engine.js';
import crypto from 'crypto';

/**
 * MemoryProvider — A zero-config in-memory storage driver for ManasDB.
 * Primarily used for development, testing, and rapid prototyping.
 * 
 * Note: Data is lost when the Node.js process restarts.
 */
class MemoryProvider extends BaseProvider {
  constructor(uri, dbName, projectName, debug = false) {
    super();
    this.projectName = projectName || 'default';
    this.debug = debug;
    this.documents = []; // { id, text, metadata, project, hash }
    this.vectors = [];   // { id, parentId, vector, text, project }
    this.MEMORY_LIMIT = 5000;
  }

  async init(targetDims) {
    if (this.debug) console.log(`[ManasDB] MemoryProvider initialized for project: ${this.projectName}`);
    return true;
  }

  /**
   * Persists a document and its vectors in-memory.
   */
  async insert({ rawText, filteredText, chunks, parentTags, aiProvider, targetDims }) {
    // 0. Deduplication Check
    const contentHash = crypto.createHash('sha256').update(rawText).digest('hex');
    const existingDoc = this.documents.find(d => d.hash === contentHash && d.project === this.projectName);
    
    if (existingDoc) {
      if (this.debug) console.log(`[ManasDB] Duplicate content detected. Skipping vector generation for MemoryProvider.`);
      return { documentId: existingDoc.id, chunksInserted: 0, isDuplicate: true };
    }

    // 1. Memory Limit Check
    if (this.vectors.length > this.MEMORY_LIMIT) {
      process.emitWarning(
        `[ManasDB] MemoryProvider limit reached (${this.vectors.length} vectors). ` +
        `Performance will degrade and memory usage may become unstable. ` +
        `Switch to MongoDB or PostgreSQL for production loads.`,
        'ManasDBWarning'
      );
    }

    const documentId = Date.now().toString() + Math.random().toString(36).substring(7);
    
    // 2. Store the "Document"
    this.documents.push({
      id: documentId,
      text: rawText,
      hash: contentHash,
      metadata: parentTags,
      project: this.projectName
    });

    // 3. Store the "Vectors" (Chunks)
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

    return { documentId, chunksInserted: chunks.length };
  }

  /**
   * Performs a brute-force memory scan for the nearest vectors.
   */
  async vectorSearch({ queryVector, limit, minScore, aiModelName }) {
    // Filter by project and calculate similarity
    const results = this.vectors
      .filter(v => v.project === this.projectName)
      .map(v => {
        const score = MemoryEngine._cosine(queryVector, v.vector);
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

  async delete(documentId) {
    const initialDocCount = this.documents.length;
    this.documents = this.documents.filter(d => d.id !== documentId || d.project !== this.projectName);
    this.vectors = this.vectors.filter(v => v.parentId !== documentId || v.project !== this.projectName);
    
    return { 
      deleted: initialDocCount > this.documents.length, 
      documentId 
    };
  }

  async updateManifest(manifest) {
    this._manifest = manifest;
  }

  /**
   * Stub for budget tracking (MemoryProvider is $0)
   */
  async getMonthlySpend() {
    return 0;
  }

  /**
   * Clear all memories for this project.
   */
  async clear() {
    this.documents = this.documents.filter(d => d.project !== this.projectName);
    this.vectors = this.vectors.filter(v => v.project !== this.projectName);
    return true;
  }

  async health() {
    return { status: 'ok', engine: 'in-memory', project: this.projectName };
  }

  async list(limit = 10) {
    return this.documents
      .filter(d => d.project === this.projectName)
      .slice(0, limit);
  }
}

export default MemoryProvider;
