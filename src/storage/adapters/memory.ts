import { MemoryRepository } from '../../domain/repositories/MemoryRepository.ts';
import { Memory, MemoryChunk } from '../../domain/entities/Memory.ts';
import { Vector } from '../../domain/value-objects/Vector.ts';
import type { StorageManifest, FilterExpression } from '../../types/index.ts';
import { FeatureNotImplementedError } from '../../errors/index.ts';

const NOT_YET = (method: string) =>
  new FeatureNotImplementedError(`MemoryAdapter.${method}() is a scaffold — not implemented yet. See __placeholder.`);

export class MemoryAdapter implements MemoryRepository {
  /**
   * Scaffold marker — save/findById/delete/connect/disconnect/clear are
   * real and genuinely work against the in-process cache. findSimilar,
   * findKeyword, deleteMany, updateManifest, getMonthlySpend,
   * expireOlderThan, and list are not — each throws rather than returning
   * a hardcoded empty/zero result that would look like a real "no matches"
   * or "$0 spent" answer. See MongoAdapter.__placeholder for the full
   * rationale (also: assertStorageReady() blocks this from the 'runtime'
   * path regardless — this is the redundant, fail-loud second layer).
   */
  public readonly __placeholder = true as const;

  private cache: Map<string, Memory> = new Map();
  private vectors: Array<{ id: string, vector: Float32Array, memory: Memory }> = [];

  public async connect(): Promise<void> {
    console.log('[MemoryAdapter] Working memory initialized');
  }

  public async save(memory: Memory): Promise<void> {
    this.cache.set(memory.id, memory);

    // Simulate indexing a vector if present for brute-force cosine similarity
    if (memory.metadata?.vector) {
      this.vectors.push({
        id: memory.id,
        vector: memory.metadata.vector as Float32Array,
        memory
      });
    }
  }

  public async findById(id: string): Promise<Memory | null> {
    return this.cache.get(id) || null;
  }

  public async findSimilar(vector: Vector, limit: number, threshold: number): Promise<MemoryChunk[]> {
    throw NOT_YET('findSimilar');
  }

  public async delete(id: string): Promise<void> {
    this.cache.delete(id);
    this.vectors = this.vectors.filter(v => v.id !== id);
  }

  public async init(dimensions?: number): Promise<void> {}

  public async findKeyword(query: string, limit: number): Promise<MemoryChunk[]> {
    throw NOT_YET('findKeyword');
  }

  public async deleteMany(query: FilterExpression): Promise<number> {
    throw NOT_YET('deleteMany');
  }

  // Real, not a scaffold: trivial and correct against the cache/vectors
  // that save()/findById()/delete() already genuinely maintain.
  public async clear(): Promise<void> {
    this.cache.clear();
    this.vectors = [];
  }

  public async getManifest(): Promise<StorageManifest> {
    return {};
  }

  public async updateManifest(manifest: StorageManifest): Promise<void> {
    throw NOT_YET('updateManifest');
  }

  public async getMonthlySpend(): Promise<number> {
    throw NOT_YET('getMonthlySpend');
  }

  public async expireOlderThan(date: Date): Promise<number> {
    throw NOT_YET('expireOlderThan');
  }

  public async list(limit: number): Promise<MemoryChunk[]> {
    throw NOT_YET('list');
  }

  public async disconnect(): Promise<void> {
    this.cache.clear();
    this.vectors = [];
    console.log('[MemoryAdapter] Working memory cleared');
  }
}
