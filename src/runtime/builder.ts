import { Runtime } from './index.ts';
import { StorageProvider } from '../storage/providers/StorageProvider.ts';

import { ConfigError } from '../errors/index.ts';
import type { RuntimeConfig } from './config.ts';

export class RuntimeBuilder {
  private _config: RuntimeConfig = {};

  public withStorageProvider(provider: StorageProvider): this {
    this._config.storageProvider = provider;
    return this;
  }

  public withDebug(debug: boolean): this {
    this._config.debug = debug;
    return this;
  }

  public build(): Runtime {
    if (!this._config.storageProvider) {
      throw new ConfigError('Runtime requires a valid StorageProvider to be built.');
    }
    const runtime = new Runtime(this._config);
    // Complete all internal wiring here — the caller receives a fully assembled Runtime.
    // pipeline.setEventBus enables PipelineUnhandled event emission for observability.
    runtime.pipeline.setEventBus(runtime.events);
    return runtime;
  }
}
