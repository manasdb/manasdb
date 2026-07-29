/**
 * VectorNormalizer — Utility for ensuring unit-length vectors.
 * Critical for consistent cosine similarity across different DB backends.
 */
export class VectorNormalizer {
  /**
   * Scales a vector so its magnitude is 1.0.
   */
  static normalize(vector: number[]): number[] {
    if (!vector || vector.length === 0) return vector;
    
    const magnitude = Math.sqrt(
      vector.reduce((sum, v) => sum + v * v, 0)
    );
    
    if (magnitude === 0) {
      return vector;
    }
    
    return vector.map(v => v / magnitude);
  }

  /**
   * Calculates the Euclidean magnitude of a vector.
   */
  static getMagnitude(vector: number[]): number {
    if (!vector || vector.length === 0) return 0;
    return Math.sqrt(
      vector.reduce((sum, v) => sum + v * v, 0)
    );
  }

  /**
   * Checks if a vector is already unit-length within a tolerance.
   */
  static isNormalized(vector: number[], tolerance = 0.001): boolean {
    const magnitude = this.getMagnitude(vector);
    return Math.abs(magnitude - 1.0) < tolerance;
  }
}

export default VectorNormalizer;
