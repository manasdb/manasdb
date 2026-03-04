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
}

export default MemoryEngine;
