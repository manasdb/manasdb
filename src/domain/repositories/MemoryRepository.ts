import { Memory, MemoryChunk } from '../entities/Memory.ts';
import { Vector } from '../value-objects/Vector.ts';
import type { StorageManifest, FilterExpression } from '../../types/index.ts';

export interface MemoryRepository {
  init(dimensions?: number): Promise<void>;
  save(memory: Memory): Promise<void>;
  findById(id: string): Promise<Memory | null>;
  findSimilar(vector: Vector, limit: number, minScore: number): Promise<MemoryChunk[]>;
  findKeyword(query: string, limit: number): Promise<MemoryChunk[]>;
  delete(id: string): Promise<void>;
  deleteMany(query: FilterExpression): Promise<number>;
  clear(): Promise<void>;
  getManifest(): Promise<StorageManifest>;
  updateManifest(manifest: StorageManifest): Promise<void>;
  getMonthlySpend(): Promise<number>;
  expireOlderThan(date: Date): Promise<number>;
  list(limit: number): Promise<MemoryChunk[]>;
}
