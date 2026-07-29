import ManasDB from '../index.ts';
import type { ManasDBConfig, AbsorbOptions } from '../types/index.ts';

/**
 * ProjectRegistry
 * 
 * Manages multiple ManasDB instances for multi-tenant applications.
 * Handles lazy-initialization and shared configuration.
 */
export class ProjectRegistry {
  private baseConfig: ManasDBConfig;
  private instances: Map<string, any>;

  constructor(baseConfig: ManasDBConfig = {}) {
    this.baseConfig = baseConfig;
    this.instances = new Map();
  }

  /**
   * Retrieves or initializes a ManasDB instance for a specific project.
   */
  async get(projectName: string, config: ManasDBConfig = {}): Promise<any> {
    if (this.instances.has(projectName)) {
      return this.instances.get(projectName);
    }

    const mergedConfig: ManasDBConfig = {
      ...this.baseConfig,
      ...config,
      projectName
    };

    const instance = new ManasDB(mergedConfig);
    await instance.init();
    
    this.instances.set(projectName, instance);
    return instance;
  }

  /**
   * Bulk ingestion across multiple projects (Shared Memories).
   */
  async broadcastAbsorb(text: string, projects: string[] = [], options: AbsorbOptions = {}): Promise<PromiseSettledResult<any>[]> {
    const promises = projects.map(async (p) => {
      const db = await this.get(p);
      return db.absorb(text, options);
    });
    return Promise.allSettled(promises);
  }

  /**
   * Aggregated health and stats across all active projects.
   */
  async getRegistryStats(): Promise<Record<string, { primaryDB: string; model: string }>> {
    const stats: Record<string, { primaryDB: string; model: string }> = {};
    for (const [name, instance] of this.instances) {
      stats[name] = {
        primaryDB: instance.databaseDrivers[0]?.constructor.name || 'none',
        model: instance.modelConfig.model || instance.modelConfig.source
      };
    }
    return stats;
  }
}

export default ProjectRegistry;
