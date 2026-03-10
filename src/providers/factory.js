/**
 * ProviderFactory — Lazy-loading registry for ManasDB storage drivers.
 *
 * Design principles:
 *  • Zero top-level driver imports — npm packages (mongodb, pg, ioredis) are only
 *    loaded inside their respective .init() methods.
 *  • Storage drivers (MongoDB, Postgres) extend BaseProvider.
 *  • Cache providers (Redis) are separate — they use a distinct createCacheProvider().
 *
 * @module providers/factory
 */

import MongoProvider    from './mongodb.js';
import PostgresProvider from './postgres.js';
import RedisProvider    from './redis.js';

// ── URI auto-detection ────────────────────────────────────────────────────────
/**
 * Infers the dbType from a connection URI string.
 * @param {string} uri
 * @returns {'postgres'|'mongodb'|'redis'}
 */
export function inferTypeFromUri(uri = '') {
    const l = uri.toLowerCase();
    if (l.startsWith('postgres') || l.startsWith('postgresql')) return 'postgres';
    if (l.startsWith('redis'))                                    return 'redis';
    return 'mongodb';
}

// ── Storage Provider Registry (Durable DBs) ──────────────────────────────────
const PROVIDER_REGISTRY = {
    mongodb:    MongoProvider,
    postgres:   PostgresProvider,
    pg:         PostgresProvider,
    postgresql: PostgresProvider,
};

// ── Public API — Storage Providers ───────────────────────────────────────────

/**
 * Builds a single durable storage provider instance.
 */
export async function createProvider(dbConfig, projectName, debug = false) {
    let canonicalType;
    if (dbConfig.type) {
        canonicalType = dbConfig.type.toLowerCase();
        if (!PROVIDER_REGISTRY[canonicalType]) {
            throw new Error(`[ManasDB] Unknown provider type "${canonicalType}". Supported types: mongodb, postgres.`);
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
export async function createProviders(dbConfigs, projectName, debug = false) {
    return Promise.all(dbConfigs.map(cfg => createProvider(cfg, projectName, debug)));
}

// ── Public API — Cache Provider ───────────────────────────────────────────────

/**
 * Builds the Tier 1 cache provider from a cache config block:
 *   { provider: 'redis', uri: 'redis://...', semanticThreshold: 0.92, ttl: 3600 }
 *
 * @param {Object} cacheConfig
 * @param {boolean} debug
 * @returns {RedisProvider|null}
 */
export function createCacheProvider(cacheConfig, debug = false) {
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

