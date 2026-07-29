import { Ollama } from 'ollama';
import BaseProvider from './base.provider.ts';
import type { EmbedResult } from './base.provider.ts';

export default class OllamaProvider extends BaseProvider {
  public model: string;
  public ollama: Ollama;

  constructor(model = 'nomic-embed-text') {
    super();
    this.model = model;
    this.ollama = new Ollama({ host: 'http://127.0.0.1:11434' });
  }

  async embed(text: string, targetDims?: number): Promise<EmbedResult> {
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
    } catch (error: any) {
      throw new Error(`MANASDB_PROVIDER_ERROR: Ollama error - ${error?.message}`);
    }
  }

  getModelKey(): string {
    return `ollama-${this.model}`;
  }
}
