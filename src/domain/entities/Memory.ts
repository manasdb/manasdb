import { Vector } from '../value-objects/Vector.ts';

export class MemoryChunk {
  constructor(
    public readonly id: string,
    public readonly documentId: string | undefined,
    public readonly text: string,
    public readonly vector: Vector | undefined,
    public readonly metadata: Record<string, unknown>,
    public readonly projectName: string,
    public readonly createdAt: Date
  ) {}
}

export class Memory {
  constructor(
    public readonly id: string,
    public readonly rawText: string,
    public readonly filteredText: string,
    public readonly chunks: MemoryChunk[],
    public readonly metadata: Record<string, unknown>,
    public readonly projectName: string,
    public readonly createdAt: Date
  ) {}
}
