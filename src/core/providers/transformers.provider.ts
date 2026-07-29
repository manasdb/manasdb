import { pipeline } from '@xenova/transformers';
import BaseProvider, { EmbedResult } from './base.provider.ts';

export default class TransformersProvider extends BaseProvider {
  private extractorPipeline: any = null;

  async getPipeline(): Promise<any> {
    if (!this.extractorPipeline) {
      this.extractorPipeline = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    }
    return this.extractorPipeline;
  }

  async embed(text: string, targetDims?: number): Promise<EmbedResult> {
    const extractor = await this.getPipeline();
    const output = await extractor(text, { pooling: 'mean', normalize: true });
    let vector = Array.from(output.data) as number[];
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

  getModelKey(): string {
    return 'local-minilm';
  }
}
