import type { ModuleManifest } from '../../contracts/ModuleManifest.ts';

export type { ModuleManifest };

export class CapabilityRegistry {
  private _manifests = new Map<string, ModuleManifest>();

  public register(manifest: ModuleManifest): void {
    if (this._manifests.has(manifest.name)) {
      throw new Error(`Module ${manifest.name} is already registered.`);
    }
    this._manifests.set(manifest.name, manifest);
  }

  public hasCapability(moduleName: string, capability: string): boolean {
    const manifest = this._manifests.get(moduleName);
    if (!manifest) return false;
    return manifest.capabilities.includes(capability);
  }

  public getModulesWithCapability(capability: string): ModuleManifest[] {
    const results: ModuleManifest[] = [];
    for (const manifest of this._manifests.values()) {
      if (manifest.capabilities.includes(capability)) {
        results.push(manifest);
      }
    }
    return results;
  }
}

export class PluginRegistry {
  private _plugins = new Map<string, any>();
  private _capabilityRegistry: CapabilityRegistry;

  constructor(capabilityRegistry: CapabilityRegistry) {
    this._capabilityRegistry = capabilityRegistry;
  }

  public loadPlugin(plugin: any, manifest: ModuleManifest): void {
    this._capabilityRegistry.register(manifest);
    this._plugins.set(manifest.name, plugin);
  }

  public getPlugin<T>(name: string): T | undefined {
    return this._plugins.get(name) as T;
  }
}
