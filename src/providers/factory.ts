import MongoProvider from './mongodb.ts';
import PostgresProvider from './postgres.ts';
import RedisProvider from './redis.ts';
import MemoryProvider from './memory.ts';
import type { DatabaseConfig, CacheConfig } from '../types/index.ts';

/**
 * Infers the dbType from a connection URI string.
 */
export function inferTypeFromUri(uri = ''): 'postgres' | 'mongodb' | 'redis' | 'memory' {
    if (!uri) return 'memory';
    const l = uri.toLowerCase();
    if (l.startsWith('postgres') || l.startsWith('postgresql')) return 'postgres';
    if (l.startsWith('redis')) return 'redis';
    if (l.startsWith('memory:')) return 'memory';
    return 'mongodb';
}

const PROVIDER_REGISTRY: Record<string, any> = {
    mongodb: MongoProvider,
    postgres: PostgresProvider,
    pg: PostgresProvider,
    postgresql: PostgresProvider,
    memory: MemoryProvider,
};

/**
 * Builds a single durable storage provider instance.
 */
export async function createProvider(dbConfig: DatabaseConfig, projectName: string, debug = false): Promise<any> {
    let canonicalType: string;
    if (dbConfig.type) {
        canonicalType = dbConfig.type.toLowerCase();
        if (!PROVIDER_REGISTRY[canonicalType]) {
            throw new Error(`[ManasDB] Unknown provider type "${canonicalType}". Supported types: mongodb, postgres, memory.`);
        }
    } else {
        canonicalType = inferTypeFromUri(dbConfig.uri);
    }

    const ProviderClass = PROVIDER_REGISTRY[canonicalType];
    return new ProviderClass(dbConfig.uri, dbConfig.dbName, projectName, debug);
}

/**
 * Builds provider instances for every entry in the `databases` array.
 */
export async function createProviders(dbConfigs: DatabaseConfig[], projectName: string, debug = false): Promise<any[]> {
    return Promise.all(dbConfigs.map(cfg => createProvider(cfg, projectName, debug)));
}

/**
 * Builds the Tier 1 cache provider from a cache config block.
 */
export function createCacheProvider(cacheConfig: CacheConfig, debug = false): RedisProvider | null {
    if (!cacheConfig || !cacheConfig.provider) return null;

    const type = cacheConfig.provider.toLowerCase();
    if (type === 'redis') {
        if (!cacheConfig.uri) throw new Error('[ManasDB] Redis cache requires a `uri` field.');
        return new RedisProvider(
            cacheConfig.uri,
            cacheConfig.ttl ?? 3600,
            cacheConfig.semanticThreshold ?? 0.92,
            debug
        );
    }

    throw new Error(`[ManasDB] Unknown cache provider "${type}". Supported: redis.`);
}

export default { createProvider, createProviders, createCacheProvider, inferTypeFromUri };
