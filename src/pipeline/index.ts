import { ExecutionContext } from '../runtime/context/index.ts';
import { EventBus } from '../events/index.ts';

export class OperationContext<TPayload = unknown, TResult = unknown> {
  public readonly params: {
    payload: TPayload;
    result?: TResult;
    [key: string]: any;
  };
  
  private _state = new Map<string, any>();

  constructor(
    public readonly executionContext: ExecutionContext,
    public readonly observation: any,
    initialParams: Record<string, any> = {}
  ) {
    this.params = { payload: {} as TPayload, ...initialParams };
  }

  public get<T>(key: string): T | undefined {
    return this._state.get(key) as T;
  }

  public set<T>(key: string, value: T): void {
    this._state.set(key, value);
  }
}

export interface Middleware<TPayload = unknown, TResult = unknown> {
  name: string;
  execute(
    context: OperationContext<TPayload, TResult>,
    next: () => Promise<void>
  ): Promise<void>;
}

export class PipelineEngine {
  private _middlewares: Middleware[] = [];
  private _events?: EventBus;

  public setEventBus(bus: EventBus): void {
    this._events = bus;
  }

  public use(middleware: Middleware): void {
    this._middlewares.push(middleware);
  }

  public async execute<TPayload, TResult>(context: OperationContext<TPayload, TResult>): Promise<void> {
    let index = -1;

    const dispatch = async (i: number): Promise<void> => {
      if (i <= index) throw new Error('next() called multiple times');
      index = i;

      const fn = this._middlewares[i];

      if (i === this._middlewares.length) {
        // No terminal middleware handled this — emit an event for observability
        if (this._events) {
          await this._events.publish('PipelineUnhandled', {
            intent: context.params.intent,
            timestamp: new Date()
          });
        }
        return;
      }

      if (fn) {
        await fn.execute(context as any, dispatch.bind(null, i + 1));
      }
    };

    await dispatch(0);
  }
}
