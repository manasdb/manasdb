/**
 * ProviderFactory — Lazy-loading registry for ManasDB storage drivers.
 *
 * Design principles:
 *  • Zero top-level driver imports — packages (mongodb, pg) are only loaded 
 *    in their respective .init() methods.
 *  • This allows us to statically bundle them into the core without crashing 
 *    if the user doesn't have all DB libraries installed.
 *
 * @module providers/factory
 */

import MongoProvider from './mongodb.js';
import PostgresProvider from './postgres.js';

// ── URI auto-detection ────────────────────────────────────────────────────────
/**
 * Infers the dbType from a connection URI string.
 * @param {string} uri
 * @returns {'postgres'|'mongodb'}
 */
export function inferTypeFromUri(uri = '') {
    const l = uri.toLowerCase();
    if (l.startsWith('postgres') || l.startsWith('postgresql')) return 'postgres';
    return 'mongodb';
}

// ── Registry ──────────────────────────────────────────────────────────────────
const PROVIDER_REGISTRY = {
    mongodb: MongoProvider,
    postgres: PostgresProvider,
    pg: PostgresProvider,
    postgresql: PostgresProvider,
};

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Builds and returns an initialized provider instance for a single DB config.
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
    
    // The provider constructor is safe — it doesn't initialize the connection yet.
    // The actual npm package (mongodb / pg) will be dynamically imported inside .init()
    return new ProviderClass(dbConfig.uri, dbConfig.dbName, projectName, debug);
}

/**
 * Builds provider instances for every entry in the `databases` array.
 */
export async function createProviders(dbConfigs, projectName, debug = false) {
    return Promise.all(dbConfigs.map(cfg => createProvider(cfg, projectName, debug)));
}

export default { createProvider, createProviders, inferTypeFromUri };
