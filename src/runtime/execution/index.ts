import { CognitiveTransaction } from '../transaction/index.ts';
import { PipelineEngine } from '../../pipeline/index.ts';
import { StorageProvider } from '../../storage/providers/StorageProvider.ts';

export class ExecutionOrchestrator {
  constructor(
    private readonly _pipeline: PipelineEngine,
    private readonly _storage?: StorageProvider
  ) {}

  public async dispatch<T>(intent: string, operation: (tx: CognitiveTransaction) => Promise<T>): Promise<T> {
    const tx = new CognitiveTransaction(this._pipeline, this._storage);
    tx.context.setMetadata('intent', intent);
    return tx.execute(async () => operation(tx));
  }
}
