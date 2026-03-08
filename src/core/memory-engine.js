import { pipeline } from '@xenova/transformers';

/**
 * MemoryEngine handles the AI logic for ManasDB.
 * Utilizes a Singleton pattern for the embedding pipeline to ensure it only downloads once.
 */
class MemoryEngine {
  /**
   * Private static field to hold the feature extraction pipeline.
   * This guarantees that model initialization only occurs once during the lifecycle.
   */
  static #extractorPipeline = null;

  /**
   * Initializes or reuses the extraction pipeline.
   * @returns {Promise<any>} The feature extraction pipeline.
   */
  static async getPipeline() {
    if (!this.#extractorPipeline) {
      // Lazy-load the embedding pipeline only when first requested.
      this.#extractorPipeline = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    }
    return this.#extractorPipeline;
  }

  /**
   * Generates a numeric vector array representing the input text.
   * @param {string} text - The input text to vectorize.
   * @returns {Promise<number[]>} The vector array.
   */
  static async generateEmbedding(text) {
    const extractor = await this.getPipeline();
    // pooling: 'mean' generates sentence-level embeddings instead of token-level.
    // normalize: true scales vectors functionally for standard cosine similarity queries.
    const output = await extractor(text, { pooling: 'mean', normalize: true });
    
    // The pipeline returns a Float32Array object. Convert it to a standard JS Array explicitly.
    return Array.from(output.data);
  }

  /**
   * Extracts generic tags/keywords from the given text.
   * For this implementation, it filters terms strictly longer than 4 characters.
   * 
   * @param {string} text - The input text.
   * @returns {Object} An object encapsulating the keywords and temporal timestamp.
   */
  static extractTags(text) {
    // Break the sentence into isolated word segments
    const words = text.split(/\W+/);
    
    // Narrow down longer words and normalize them
    const keywords = words
      .filter(word => word.length > 4)
      .map(word => word.toLowerCase());
      
    // Remove redundancies
    const uniqueKeywords = [...new Set(keywords)];
    
    return {
      keywords: uniqueKeywords,
      timestamp: Date.now()
    };
  }

  /**
   * Cosine similarity between two vectors. Safely handles mismatched lengths
   * (e.g. comparing a 384-dim query vs 128-dim speed chunk).
   * 
   * @param {number[]} a 
   * @param {number[]} b 
   * @returns {number} Score bounded to 0-1
   */
  static _cosine(a, b) {
    if (!a || !b) return 0;
    const len = Math.min(a.length, b.length);
    let dot = 0, na = 0, nb = 0;
    
    for (let i = 0; i < len; i++) {
      dot += a[i] * b[i];
      na  += a[i] * a[i];
      nb  += b[i] * b[i];
    }
    
    return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-9);
  }

  /**
   * Token-aware sliding window chunker for large documents.
   * Approximates tokens using words for speed, preventing AI dilution on giant strings.
   * 
   * @param {string} text - The full document text.
   * @param {number} maxTokens - Target max words per chunk.
   * @param {number} overlapTokens - Overlap window size.
   * @returns {Array} Array of chunk objects ready for embedding.
   */
  static _tokenAwareChunk(text, maxTokens = 100, overlapTokens = 20) {
    if (!text || text.trim() === '') return [];
    
    // Split by paragraphs to respect natural semantic boundaries first
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim());
    const chunks = [];
    let chunkIndex = 0;

    for (const para of paragraphs) {
      const words = para.split(/\s+/);
      
      // If paragraph fits entirely, use it as one chunk
      if (words.length <= maxTokens) {
        chunks.push({
          text: para,
          embedText: para,
          sectionTitle: '',
          chunkIndex: chunkIndex++,
          totalInSection: 0 // Will update after
        });
        continue;
      }

      // Sliding window logic for dense paragraphs
      let i = 0;
      while (i < words.length) {
        let chunkEnd = Math.min(i + maxTokens, words.length);
        const windowWords = words.slice(i, chunkEnd);
        const chunkText = windowWords.join(' ');
        
        chunks.push({
          text: chunkText,
          embedText: chunkText,
          sectionTitle: '',
          chunkIndex: chunkIndex++,
          totalInSection: 0
        });

        if (chunkEnd === words.length) break;
        // Slide forward, leaving an overlap
        i += (maxTokens - overlapTokens);
      }
    }

    // Update total sections
    for (let c of chunks) {
      c.totalInSection = chunks.length;
    }

    return chunks;
  }
}

export default MemoryEngine;
