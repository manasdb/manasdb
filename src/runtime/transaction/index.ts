import { ExecutionContext } from '../context/index.ts';
import { PipelineEngine } from '../../pipeline/index.ts';
import { StorageProvider } from '../../storage/providers/StorageProvider.ts';

export enum TransactionState {
  PENDING = 'PENDING',
  EXECUTING = 'EXECUTING',
  COMMITTED = 'COMMITTED',
  ROLLED_BACK = 'ROLLED_BACK',
  FAILED = 'FAILED'
}

export class CognitiveTransaction {
  private _state: TransactionState = TransactionState.PENDING;
  public readonly context: ExecutionContext;

  constructor(pipeline: PipelineEngine, storage?: StorageProvider) {
    this.context = new ExecutionContext(pipeline, storage);
  }

  public get state(): TransactionState { return this._state; }

  public async execute<T>(operation: (ctx: ExecutionContext) => Promise<T>): Promise<T> {
    if (this._state !== TransactionState.PENDING) {
      throw new Error(`Transaction cannot execute from state ` + this._state);
    }
    this._state = TransactionState.EXECUTING;
    try {
      const result = await operation(this.context);
      this._state = TransactionState.COMMITTED;
      return result;
    } catch (error) {
      this._state = TransactionState.FAILED;
      throw error;
    }
  }
}
