export interface EmbedResult {
  vector: number[];
  dims: number;
  model: string;
  originalDims?: number;
}

export default class BaseProvider {
  /**
   * Generates a numeric vector array representing the input text.
   */
  async embed(text: string, targetDims?: number): Promise<EmbedResult> {
    throw new Error('embed() must be implemented by subclass');
  }

  /**
   * Truncates and normalizes an analytical vector (Matryoshka representation).
   */
  truncate(vector: number[], targetDims?: number): number[] {
    if (!targetDims || targetDims >= vector.length) {
      return vector;
    }

    const truncated = vector.slice(0, targetDims);

    let sumOfSquares = 0;
    for (let i = 0; i < truncated.length; i++) {
        sumOfSquares += truncated[i] * truncated[i];
    }
    const magnitude = Math.sqrt(sumOfSquares);
    
    if (magnitude === 0) return truncated;

    return truncated.map(val => val / magnitude);
  }

  /**
   * Returns the model mapping key string used in vectors object.
   */
  getModelKey(): string {
    throw new Error('getModelKey() must be implemented by subclass');
  }
}
