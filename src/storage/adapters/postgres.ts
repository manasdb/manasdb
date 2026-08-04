import { MemoryRepository } from '../../domain/repositories/MemoryRepository.ts';
import { Memory, MemoryChunk } from '../../domain/entities/Memory.ts';
import { Vector } from '../../domain/value-objects/Vector.ts';
import type { Pool } from 'pg';
import type { StorageManifest, FilterExpression } from '../../types/index.ts';
import { FeatureNotImplementedError } from '../../errors/index.ts';

const NOT_YET = (method: string) =>
  new FeatureNotImplementedError(`PostgresAdapter.${method}() is a scaffold — not implemented yet. See __placeholder.`);

export class PostgresAdapter implements MemoryRepository {
  /** Scaffold marker — see MongoAdapter.__placeholder for why this exists,
   * and why every data-plane method below throws instead of faking success. */
  public readonly __placeholder = true as const;

  private client: Pool | null = null;
  private isConnected = false;

  public async connect(): Promise<void> {
    if (this.isConnected) return;
    // TODO(scaffold): construct a real `new Pool({ connectionString: ... })` here.
    this.isConnected = true;
    console.log('[PostgresAdapter] Connected to PostgreSQL (scaffold — no real pool yet)');
  }

  public async save(memory: Memory): Promise<void> {
    throw NOT_YET('save');
  }

  public async findById(id: string): Promise<Memory | null> {
    throw NOT_YET('findById');
  }

  public async findSimilar(vector: Vector, limit: number, threshold: number): Promise<MemoryChunk[]> {
    throw NOT_YET('findSimilar');
  }

  public async delete(id: string): Promise<void> {
    throw NOT_YET('delete');
  }

  public async init(dimensions?: number): Promise<void> {}

  public async findKeyword(query: string, limit: number): Promise<MemoryChunk[]> {
    throw NOT_YET('findKeyword');
  }

  public async deleteMany(query: FilterExpression): Promise<number> {
    throw NOT_YET('deleteMany');
  }

  public async clear(): Promise<void> {
    throw NOT_YET('clear');
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
    if (!this.isConnected) return;
    this.client = null;
    this.isConnected = false;
    console.log('[PostgresAdapter] Disconnected from PostgreSQL');
  }
}
