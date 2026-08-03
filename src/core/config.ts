import type { ManasDBConfig, DatabaseConfig } from '../types/index.ts';
import { ConfigError } from '../errors/index.ts';

export class ConfigurationManager {
  private _config!: Readonly<ManasDBConfig>;
  private _locked = false;

  public load(rawConfig: ManasDBConfig = {}): void {
    if (this._locked) {
      throw new ConfigError('Configuration is already locked and cannot be modified.');
    }

    // Apply defaults and sanitize
    const config: ManasDBConfig = {
      projectName: rawConfig.projectName || 'default',
      debug: rawConfig.debug === true,
      telemetry: rawConfig.telemetry !== false, // default true
      modelConfig: rawConfig.modelConfig || { source: 'transformers' },
      retry: rawConfig.retry || { attempts: 1, backoff: 0, budget: { monthlyLimit: Infinity, currentSpend: 0 } },
      cache: rawConfig.cache || undefined,
      reasoning: rawConfig.reasoning || { enabled: false, maxDepth: 3 },
      piiShield: this._normalizePIIConfig(rawConfig.piiShield),
      databases: this._normalizeDatabases(rawConfig)
    };

    // Deep freeze the configuration to make it immutable
    this._config = this._deepFreeze(config);
    this._locked = true;
  }

  public get get(): Readonly<ManasDBConfig> {
    if (!this._locked) throw new ConfigError('Configuration has not been loaded yet.');
    return this._config;
  }

  private _normalizePIIConfig(piiShield: any) {
    if (piiShield === true) return { enabled: true, customRules: [] };
    if (typeof piiShield === 'object' && piiShield !== null) {
      return {
        enabled: piiShield.enabled !== undefined ? piiShield.enabled : true,
        customRules: Array.isArray(piiShield.customRules) ? piiShield.customRules : []
      };
    }
    return { enabled: false, customRules: [] };
  }

  private _normalizeDatabases(rawConfig: ManasDBConfig): DatabaseConfig[] {
    let dbConfigs: DatabaseConfig[] = rawConfig.databases || [];
    if (!rawConfig.databases || !Array.isArray(rawConfig.databases)) {
      if (rawConfig.uri) {
        let inferType = rawConfig.dbType;
        if (!inferType) {
          if (rawConfig.uri.startsWith('mongodb')) inferType = 'mongodb';
          else if (rawConfig.uri.startsWith('postgres') || rawConfig.uri.startsWith('postgresql')) inferType = 'postgres';
          else if (rawConfig.uri.startsWith('redis')) inferType = 'redis';
        }
        dbConfigs = [{ type: inferType || 'memory', uri: rawConfig.uri, dbName: rawConfig.dbName }];
      } else {
        dbConfigs = [];
      }
    }
    return dbConfigs.length > 0 ? dbConfigs : [{ type: 'memory' }];
  }

  private _deepFreeze<T>(object: T): Readonly<T> {
    const propNames = Object.getOwnPropertyNames(object);
    for (const name of propNames) {
      const value = (object as any)[name];
      if (value && typeof value === 'object') {
        this._deepFreeze(value);
      }
    }
    return Object.freeze(object);
  }
}
