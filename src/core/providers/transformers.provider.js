import { pipeline } from '@xenova/transformers';
import BaseProvider from './base.provider.js';

export default class TransformersProvider extends BaseProvider {
  #extractorPipeline = null;

  async getPipeline() {
    if (!this.#extractorPipeline) {
      this.#extractorPipeline = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    }
    return this.#extractorPipeline;
  }

  /**
   * @param {string} text 
   * @param {number} [targetDims]
   * @returns {Promise<{vector: number[], dims: number, model: string, originalDims: number}>}
   */
  async embed(text, targetDims) {
    const extractor = await this.getPipeline();
    const output = await extractor(text, { pooling: 'mean', normalize: true });
    let vector = Array.from(output.data);
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
  }

  getModelKey() {
    return 'local-minilm';
  }
}
