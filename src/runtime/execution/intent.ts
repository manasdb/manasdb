import { randomUUID } from 'crypto';
import { ExecutionContext } from '../context/index.ts';
import { OperationContext } from '../../pipeline/index.ts';
import { Observation } from '../../cognitive/index.ts';

export abstract class CognitiveIntent {
  public readonly id: string;
  public readonly metadata: Record<string, any>;
  public readonly timestamp: Date;

  constructor(metadata: Record<string, any> = {}) {
    this.id = randomUUID();
    this.metadata = metadata;
    this.timestamp = new Date();
  }

  public abstract execute(context: ExecutionContext): Promise<any>;
}

export class ObserveIntent extends CognitiveIntent {
  constructor(
    public readonly payload: { text: string; options?: Record<string, any> },
    metadata?: Record<string, any>
  ) {
    super(metadata);
  }

  public async execute(context: ExecutionContext): Promise<any> {
    const obs = { id: randomUUID(), source: 'text', rawContent: this.payload.text, timestamp: new Date() };
    const opCtx = new OperationContext(context, obs, { intent: 'absorb' });
    await context.pipeline.execute(opCtx);
    return opCtx.params.result;
  }
}

export class RecallIntent extends CognitiveIntent {
  constructor(
    public readonly payload: { query: string; options?: Record<string, any> },
    metadata?: Record<string, any>
  ) {
    super(metadata);
  }

  public async execute(context: ExecutionContext): Promise<any> {
    const obs = { id: randomUUID(), source: 'query', rawContent: this.payload.query, timestamp: new Date() };
    const opCtx = new OperationContext(context, obs, { intent: 'recall' });
    await context.pipeline.execute(opCtx);
    return opCtx.params.result;
  }
}

export class ForgetIntent extends CognitiveIntent {
  constructor(
    public readonly payload: { id: string; options?: Record<string, any> },
    metadata?: Record<string, any>
  ) {
    super(metadata);
  }

  public async execute(context: ExecutionContext): Promise<any> {
    const obs = { id: randomUUID(), source: 'id', rawContent: this.payload.id, timestamp: new Date() };
    const opCtx = new OperationContext(context, obs, { intent: 'forget' });
    await context.pipeline.execute(opCtx);
    return opCtx.params.result;
  }
}

export class HybridRecallIntent extends CognitiveIntent {
  constructor(
    public readonly payload: { query: string; options?: Record<string, any> },
    metadata?: Record<string, any>
  ) {
    super(metadata);
  }

  public async execute(context: ExecutionContext): Promise<any> {
    const obs = { id: randomUUID(), source: 'query', rawContent: this.payload.query, timestamp: new Date() };
    const opCtx = new OperationContext(context, obs, { intent: 'hybridRecall' });
    await context.pipeline.execute(opCtx);
    return opCtx.params.result;
  }
}

export class BeliefRevisionIntent extends CognitiveIntent {
  constructor(
    public readonly payload: { fact: string; confidence?: number; options?: Record<string, any> },
    metadata?: Record<string, any>
  ) {
    super(metadata);
  }

  public async execute(context: ExecutionContext): Promise<any> {
    return { fact: this.payload.fact, confidence: this.payload.confidence || 0.9, status: 'verified' };
  }
}
