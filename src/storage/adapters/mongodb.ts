import { MemoryRepository } from '../../domain/repositories/MemoryRepository.ts';
import { Memory, MemoryChunk } from '../../domain/entities/Memory.ts';
import { Vector } from '../../domain/value-objects/Vector.ts';
import { ModuleManifest } from '../../contracts/ModuleManifest.ts';
import type { StorageManifest, FilterExpression } from '../../types/index.ts';
import { FeatureNotImplementedError } from '../../errors/index.ts';

export const manifest: ModuleManifest = {
  name: 'mongodb-adapter',
  version: '0.5.1',
  type: 'adapter',
  capabilities: ['vector-search', 'metadata-filter', 'ttl']
};

const NOT_YET = (method: string) =>
  new FeatureNotImplementedError(`MongoAdapter.${method}() is a scaffold — not implemented yet. See __placeholder.`);

export class MongoAdapter implements MemoryRepository {
  /**
   * Scaffold marker — every data-plane method below throws rather than
   * silently returning empty/zero results (see NOT_YET). `assertStorageReady()`
   * in `src/storage/guard.ts` also refuses to let anything flagged
   * `__placeholder` be used to service a 'runtime'-routed operation — this
   * is the second, redundant layer: even if that guard were ever bypassed
   * (a direct unit test against this class, for instance), calling a method
   * here fails loudly instead of quietly behaving like "no results found".
   * Remove this line only once save/findSimilar/findKeyword etc. are real.
   */
  public readonly __placeholder = true as const;

  // Connection lifecycle is harmless to leave as a no-op — the danger this
  // fixes is data operations *pretending* to have run, not connecting.
  public async init(dimensions?: number): Promise<void> {
    // Mongo connection and index creation logic
  }

  public async save(memory: Memory): Promise<void> {
    throw NOT_YET('save');
  }

  public async findById(id: string): Promise<Memory | null> {
    throw NOT_YET('findById');
  }

  public async findSimilar(vector: Vector, limit: number, minScore: number): Promise<MemoryChunk[]> {
    throw NOT_YET('findSimilar');
  }

  public async findKeyword(query: string, limit: number): Promise<MemoryChunk[]> {
    throw NOT_YET('findKeyword');
  }

  public async delete(id: string): Promise<void> {
    throw NOT_YET('delete');
  }

  public async deleteMany(query: FilterExpression): Promise<number> {
    throw NOT_YET('deleteMany');
  }

  public async clear(): Promise<void> {
    throw NOT_YET('clear');
  }

  // Manifest is real, static metadata — reading it can't misrepresent data
  // that was never actually written, so this stays a normal return.
  public async getManifest(): Promise<StorageManifest> {
    return manifest as unknown as StorageManifest;
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
}
