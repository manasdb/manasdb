export default class BaseProvider {
  /**
   * Generates a numeric vector array representing the input text.
   * @param {string} text - The input text to vectorize.
   * @returns {Promise<{vector: number[], dims: number, model: string}>} The vector data.
   */
  async embed(text, targetDims) {
    throw new Error('embed() must be implemented by subclass');
  }

  /**
   * Truncates and normalizes an analytical vector (Matryoshka representation).
   * @param {number[]} vector - The raw full-dimension vector array.
   * @param {number} targetDims - Exact array length to slice down to.
   * @returns {number[]} The L2 Normalized truncated vector.
   */
  truncate(vector, targetDims) {
    if (!targetDims || targetDims >= vector.length) {
      return vector;
    }

    // 1. Slice down to specified dimensions
    const truncated = vector.slice(0, targetDims);

    // 2. Mathematically Normalize (L2 Norm) exactly ensuring Cosine Similarity scaling remains stable
    let sumOfSquares = 0;
    for (let i = 0; i < truncated.length; i++) {
        sumOfSquares += truncated[i] * truncated[i];
    }
    const magnitude = Math.sqrt(sumOfSquares);
    
    if (magnitude === 0) return truncated; // Avoid NaN if practically a blank vector

    return truncated.map(val => val / magnitude);
  }

  /**
   * Returns the model mapping key string used in vectors object.
   * @returns {string} 
   */
  getModelKey() {
    throw new Error('getModelKey() must be implemented by subclass');
  }
}
