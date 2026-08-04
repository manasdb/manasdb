import { MemoryRepository } from '../../domain/repositories/MemoryRepository.ts';
import { Memory, MemoryChunk } from '../../domain/entities/Memory.ts';
import { Vector } from '../../domain/value-objects/Vector.ts';
import type { StorageManifest, FilterExpression } from '../../types/index.ts';

export class StorageProvider implements MemoryRepository {
  constructor(private readonly adapter: MemoryRepository) {}

  public async init(dimensions?: number): Promise<void> {
    await this.adapter.init(dimensions);
  }

  public async save(memory: Memory): Promise<void> {
    await this.adapter.save(memory);
  }

  public async findById(id: string): Promise<Memory | null> {
    return await this.adapter.findById(id);
  }

  public async findSimilar(vector: Vector, limit: number, minScore: number): Promise<MemoryChunk[]> {
    return await this.adapter.findSimilar(vector, limit, minScore);
  }

  public async findKeyword(query: string, limit: number): Promise<MemoryChunk[]> {
    return await this.adapter.findKeyword(query, limit);
  }

  public async delete(id: string): Promise<void> {
    await this.adapter.delete(id);
  }

  public async deleteMany(query: FilterExpression): Promise<number> {
    return await this.adapter.deleteMany(query);
  }

  public async clear(): Promise<void> {
    await this.adapter.clear();
  }

  public async getManifest(): Promise<StorageManifest> {
    return await this.adapter.getManifest();
  }

  public async updateManifest(manifest: StorageManifest): Promise<void> {
    await this.adapter.updateManifest(manifest);
  }

  public async getMonthlySpend(): Promise<number> {
    return await this.adapter.getMonthlySpend();
  }

  public async expireOlderThan(date: Date): Promise<number> {
    return await this.adapter.expireOlderThan(date);
  }

  public async list(limit: number): Promise<MemoryChunk[]> {
    return await this.adapter.list(limit);
  }
}
