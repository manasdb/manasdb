import { OperationContext, Middleware } from './index.ts';
import { StorageProvider } from '../storage/providers/StorageProvider.ts';
import { Memory } from '../domain/entities/Memory.ts';

/**
 * createStorageMiddleware() previously imported a type named
 * `PipelineMiddleware` that doesn't exist (the real exported type is
 * `Middleware`), and returned a bare function instead of the
 * `{ name, execute }` shape `Middleware` actually requires — a pre-existing
 * mismatch that predates any change described elsewhere in this codebase's
 * docs. `PipelineEngine.use()`/`execute()` call `fn.execute(...)`, so a bare
 * function was never actually callable the way this was wired — fixed here
 * to genuinely implement `Middleware`.
 */
export function createStorageMiddleware(storage: StorageProvider): Middleware {
  return {
    name: 'storage',
    async execute(context: OperationContext, next: () => Promise<void>) {
      // Inject storage into the operation context if needed by downstream,
      // or perform storage operations directly based on intent type.

      // For now, we simulate executing the intent's goal using the storage provider
      if (context.params.intent === 'absorb') {
        const memory = new Memory(context.executionContext.id, context.observation.rawContent, context.observation.rawContent, [], {}, 'default', new Date());
        context.params.result = await storage.save(memory);
      } else if (context.params.intent === 'recall') {
        context.params.result = await storage.findKeyword(context.observation.rawContent, 10);
      } else if (context.params.intent === 'hybridRecall') {
        const [v, k] = await Promise.all([
          storage.findSimilar({ values: [0.1, 0.2, 0.3], dimensions: 3 }, 10, 0.5),
          storage.findKeyword(context.observation.rawContent, 10)
        ]);
        context.params.result = [...v, ...k];
      } else if (context.params.intent === 'forget') {
        context.params.result = await storage.delete(context.observation.rawContent);
      }

      await next();
    }
  };
}
