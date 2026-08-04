import { Kernel } from './kernel/index.ts';
import { createStorageMiddleware } from '../pipeline/storage-middleware.ts';
import { ExecutionOrchestrator } from './execution/index.ts';
import { ExecutionContext } from './context/index.ts';
import { PipelineEngine } from '../pipeline/index.ts';
import { EventBus } from '../events/index.ts';
import { LifecycleManager, LifecyclePhase } from './lifecycle/index.ts';
import { CapabilityRegistry, PluginRegistry } from './registry/index.ts';
import { Scheduler } from './scheduler/index.ts';
import { StorageProvider } from '../storage/providers/StorageProvider.ts';
import type { RuntimeConfig } from './config.ts';
import { RuntimeNotInitializedError, ConfigError } from '../errors/index.ts';

/**
 * Runtime is fully immutable after construction.
 * All dependencies (including storage) are injected via RuntimeBuilder
 * before build() is called. No mutation is possible post-construction.
 */
export class Runtime {
  public readonly kernel: Kernel;
  public readonly pipeline: PipelineEngine;
  public readonly orchestrator: ExecutionOrchestrator;
  public readonly events: EventBus;
  public readonly lifecycle: LifecycleManager;
  public readonly capabilityRegistry: CapabilityRegistry;
  public readonly pluginRegistry: PluginRegistry;
  public readonly scheduler: Scheduler;
  public readonly storage: StorageProvider | undefined;
  public readonly debug: boolean;

  constructor(config: RuntimeConfig = {}) {
    // Order matters: pipeline and storage must exist before orchestrator
    this.pipeline = new PipelineEngine();
    this.kernel = new Kernel();
    this.events = new EventBus();
    this.lifecycle = new LifecycleManager();
    this.capabilityRegistry = new CapabilityRegistry();
    this.pluginRegistry = new PluginRegistry(this.capabilityRegistry);
    this.scheduler = new Scheduler();
    this.storage = config.storageProvider;
    this.debug = config.debug ?? false;
    // Orchestrator receives pipeline + storage at construction — no later mutation needed
    this.orchestrator = new ExecutionOrchestrator(this.pipeline, this.storage);
    // NOTE: EventBus is wired into Pipeline by RuntimeBuilder.build(), not here.
    // Runtime creates its parts; Builder assembles the connections between them.
  }

  public async start(): Promise<void> {
    // Fail fast — storage must be provided via RuntimeBuilder before start() is called.
    // If this throws, the runtime stays in Created phase (no lifecycle side-effects).
    if (!this.storage) {
      throw new RuntimeNotInitializedError(
        'Runtime.start() requires a StorageProvider. ' +
        'Call RuntimeBuilder.withStorageProvider() before build().'
      );
    }

    await this.lifecycle.transitionTo(LifecyclePhase.Initializing);
    try {
      await this.kernel.bootstrap();

      this.pipeline.use(createStorageMiddleware(this.storage));
      this.scheduler.setContext({ storage: this.storage });

      // Cognitive features deferred until all CRUD paths migrate
      // this.scheduler.register('background-consolidation', ...);

      this.scheduler.start();

      if (!this.pipeline || !this.events || !this.lifecycle) {
        throw new ConfigError('Runtime components (pipeline, events, lifecycle) must be initialized before Running phase.');
      }

      await this.lifecycle.transitionTo(LifecyclePhase.Running);
    } catch (err) {
      await this.lifecycle.transitionTo(LifecyclePhase.Failed);
      throw err;
    }
  }

  public async executeTransaction<T>(intent: string, operation: (ctx: ExecutionContext) => Promise<T>): Promise<T> {
    if (this.lifecycle.getCurrentPhase() !== LifecyclePhase.Running) {
      throw new RuntimeNotInitializedError('Runtime must be in Running state to execute transactions.');
    }
    return this.orchestrator.dispatch(intent, async (tx) => operation(tx.context));
  }

  public async shutdown(): Promise<void> {
    await this.lifecycle.transitionTo(LifecyclePhase.Stopping);
    this.scheduler.stop();
    this.events.clear();
    await this.kernel.shutdown();
    await this.lifecycle.transitionTo(LifecyclePhase.Stopped);
  }
}
