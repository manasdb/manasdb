import { Ollama } from 'ollama';
import BaseProvider from './base.provider.js';

export default class OllamaProvider extends BaseProvider {
  /**
   * Initializes the Ollama provider.
   * @param {string} [model='nomic-embed-text'] - The ollama model to use for embeddings.
   */
  constructor(model = 'nomic-embed-text') {
    super();
    this.model = model;
    this.ollama = new Ollama({ host: 'http://127.0.0.1:11434' });
  }

  /**
   * @param {string} text 
   * @param {number} [targetDims]
   * @returns {Promise<{vector: number[], dims: number, model: string, originalDims: number}>}
   */
  async embed(text, targetDims) {
    try {
      const response = await this.ollama.embeddings({
        model: this.model,
        prompt: text
      });
      let vector = response.embedding;
      const originalDims = vector.length;

      if (targetDims && targetDims < originalDims) {
        vector = this.truncate(vector, targetDims);
      }

      return {
        vector,
        dims: vector.length,
        model: this.getModelKey(),
        originalDims
      };
    } catch (error) {
      throw new Error(`MANASDB_PROVIDER_ERROR: Ollama error - ${error.message}`);
    }
  }

  getModelKey() {
    return `ollama-${this.model}`;
  }
}
