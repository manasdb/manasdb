import { randomUUID } from 'crypto';
import { PipelineEngine } from '../../pipeline/index.ts';
import { StorageProvider } from '../../storage/providers/StorageProvider.ts';

export class RuntimeContext {
  private _state = new Map<string, any>();

  public get<T>(key: string): T | undefined {
    return this._state.get(key) as T;
  }

  public set<T>(key: string, value: T): void {
    this._state.set(key, value);
  }
}

export class ExecutionContext {
  public readonly id: string;
  public readonly timestamp: Date;
  private _metadata = new Map<string, any>();

  constructor(
    public readonly pipeline: PipelineEngine,
    public readonly storage?: StorageProvider
  ) {
    this.id = randomUUID();
    this.timestamp = new Date();
  }

  public setMetadata(key: string, value: any): void {
    this._metadata.set(key, value);
  }

  public getMetadata<T>(key: string): T | undefined {
    return this._metadata.get(key) as T;
  }
}
