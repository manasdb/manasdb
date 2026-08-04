import { ProviderError } from '../errors/index.ts';

export type Constructor<T = any> = new (...args: any[]) => T;

export class ServiceContainer {
  private _services = new Map<string, any>();
  private _factories = new Map<string, (...args: any[]) => any>();

  public register<T>(key: string | Constructor<T>, instance: T): void {
    const name = typeof key === 'string' ? key : key.name;
    this._services.set(name, instance);
  }

  public registerFactory<T>(key: string | Constructor<T>, factory: (...args: any[]) => T): void {
    const name = typeof key === 'string' ? key : key.name;
    this._factories.set(name, factory);
  }

  public resolve<T>(key: string | Constructor<T>): T {
    const name = typeof key === 'string' ? key : key.name;
    
    if (this._services.has(name)) {
      return this._services.get(name);
    }
    
    if (this._factories.has(name)) {
      const instance = this._factories.get(name)!();
      this._services.set(name, instance); // Cache as singleton
      return instance;
    }

    throw new ProviderError(`Service not found in container: ${name}`);
  }

  public clear(): void {
    this._services.clear();
    this._factories.clear();
  }
}
