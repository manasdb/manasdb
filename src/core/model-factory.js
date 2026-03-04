import TransformersProvider from './providers/transformers.provider.js';
import OllamaProvider from './providers/ollama.provider.js';
import { OpenAIProvider, GeminiProvider } from './providers/cloud.provider.js';

class ModelFactory {
  // Singleton instances mapped by provider key
  static #instances = {};

  /**
   * Returns a singleton instance of the requested provider.
   * 
   * @param {Object} config 
   * @param {string} [config.source] - Provider source (e.g., 'ollama', 'transformers'). Default: 'transformers'
   * @param {string} [config.model] - Model name if applicable.
   * @returns {import('./providers/base.provider.js').default}
   */
  static getProvider(config = {}) {
    const source = config.source || 'transformers';
    const model = config.model || '';
    
    // Create a unique key for the provider configuration
    const cacheKey = `${source}-${model}`;

    if (!this.#instances[cacheKey]) {
      if (source === 'ollama') {
        this.#instances[cacheKey] = new OllamaProvider(model || 'nomic-embed-text');
      } else if (source === 'openai') {
        this.#instances[cacheKey] = new OpenAIProvider(model || 'text-embedding-3-small');
      } else if (source === 'gemini') {
        this.#instances[cacheKey] = new GeminiProvider(model || 'gemini-embedding-001');
      } else {
        this.#instances[cacheKey] = new TransformersProvider();
      }
    }
    
    return this.#instances[cacheKey];
  }
}

export default ModelFactory;
