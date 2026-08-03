export class Vector {
  private constructor(public readonly values: number[]) {}

  public static create(values: number[]): Vector {
    if (!Array.isArray(values) || values.length === 0) {
      throw new Error('Vector must be a non-empty array of numbers');
    }
    return new Vector(values);
  }

  public get dimensions(): number {
    return this.values.length;
  }
}
