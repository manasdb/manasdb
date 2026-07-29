import TransformersProvider from './providers/transformers.provider.js';
import OllamaProvider from './providers/ollama.provider.js';
import { OpenAIProvider, GeminiProvider } from './providers/cloud.provider.js';
import type { ModelConfig } from '../types/index.ts';

export class ModelFactory {
  private static instances: Record<string, any> = {};

  /**
   * Returns a singleton instance of the requested embedding provider.
   */
  static getProvider(config: ModelConfig = { source: 'transformers' }): any {
    const source = config.source || 'transformers';
    const model = config.model || '';
    
    const cacheKey = `${source}-${model}`;

    if (!this.instances[cacheKey]) {
      if (source === 'ollama') {
        this.instances[cacheKey] = new OllamaProvider(model || 'nomic-embed-text');
      } else if (source === 'openai') {
        this.instances[cacheKey] = new OpenAIProvider(model || 'text-embedding-3-small');
      } else if (source === 'gemini') {
        this.instances[cacheKey] = new GeminiProvider(model || 'gemini-embedding-001');
      } else {
        this.instances[cacheKey] = new TransformersProvider();
      }
    }
    
    return this.instances[cacheKey];
  }
}

export default ModelFactory;
