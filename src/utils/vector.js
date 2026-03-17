/**
 * VectorNormalizer — Utility for ensuring unit-length vectors.
 * Critical for consistent cosine similarity across different DB backends.
 */
export class VectorNormalizer {
  /**
   * Scales a vector so its magnitude is 1.0.
   * @param {number[]} vector 
   * @returns {number[]}
   */
  static normalize(vector) {
    if (!vector || vector.length === 0) return vector;
    
    const magnitude = Math.sqrt(
      vector.reduce((sum, v) => sum + v * v, 0)
    );
    
    if (magnitude === 0) {
      // Avoid division by zero, return as is or throw depending on policy.
      // For embeddings, a zero vector is usually an error state.
      return vector;
    }
    
    return vector.map(v => v / magnitude);
  }

  /**
   * Calculates the Euclidean magnitude of a vector.
   * @param {number[]} vector 
   * @returns {number}
   */
  static getMagnitude(vector) {
    if (!vector || vector.length === 0) return 0;
    return Math.sqrt(
      vector.reduce((sum, v) => sum + v * v, 0)
    );
  }

  /**
   * Checks if a vector is already unit-length within a tolerance.
   * @param {number[]} vector 
   * @param {number} tolerance 
   * @returns {boolean}
   */
  static isNormalized(vector, tolerance = 0.001) {
    const magnitude = this.getMagnitude(vector);
    return Math.abs(magnitude - 1.0) < tolerance;
  }
}

export default VectorNormalizer;
