import { ConfigurationManager } from '../../core/config.ts';
import type { ManasDBConfig } from '../../types/index.ts';
import { LifecycleError } from '../../errors/index.ts';

export class Kernel {
  private _configManager: ConfigurationManager;
  private _booted = false;

  constructor() {
    this._configManager = new ConfigurationManager();
  }

  public async bootstrap(rawConfig: ManasDBConfig = {}): Promise<void> {
    if (this._booted) throw new LifecycleError('Kernel is already booted.');
    
    this._configManager.load(rawConfig);
    const config = this._configManager.get;

    this._booted = true;
  }

  public async shutdown(): Promise<void> {
    if (!this._booted) return;
    this._booted = false;
  }

  public get config(): Readonly<ManasDBConfig> {
    return this._configManager.get;
  }
}
