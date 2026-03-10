/**
 * RedisProvider — Tier 1 Semantic Cache for ManasDB.
 *
 * This provider does NOT extend BaseProvider because it is NOT a durable store.
 * It acts as a high-speed cache layer sitting in front of MongoDB/Postgres,
 * short-circuiting recall() when a semantically similar query was already answered.
 *
 * Design:
 *  - Lazy-loads `ioredis` inside init() — never crashes if not installed.
 *  - Stores query vectors + results as JSON with a configurable TTL.
 *  - getSemanticMatch() runs cosine similarity against all cached vectors.
 *
 * @module providers/redis.provider
 */

import MemoryEngine from '../core/memory-engine.js';

class RedisProvider {
  /**
   * @param {string} uri          - Redis connection string (e.g. redis://localhost:6379)
   * @param {number} ttl          - TTL in seconds for cached entries (default: 3600 = 1 hour)
   * @param {number} threshold    - Cosine similarity threshold for a cache hit (default: 0.92)
   * @param {boolean} debug
   */
  constructor(uri, ttl = 3600, threshold = 0.92, debug = false) {
    this.uri       = uri;
    this.ttl       = ttl;
    this.threshold = threshold;
    this.debug     = debug;
    this.client    = null;
    this._prefix   = 'manasdb:cache:';
  }

  // ── Init (lazy-loads ioredis) ────────────────────────────────────────────────

  async init() {
    let Redis;
    try {
      const mod = await import('ioredis');
      Redis = mod.default || mod;
    } catch (err) {
      throw new Error(
        `[ManasDB] The 'ioredis' package is required for Redis caching. Run: npm install ioredis`
      );
    }

    this.client = new Redis(this.uri, {
      lazyConnect: true,
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
    });

    await this.client.connect();
    await this.client.ping(); // Verify connectivity

    if (this.debug) console.log(`[RedisProvider] Connected to Redis: ${this.uri}`);
  }

  // ── Core Cache Operations ────────────────────────────────────────────────────

  /**
   * Scans all cached entries for a vector whose cosine similarity to `queryVector`
   * exceeds the configured threshold.
   *
   * @param {number[]} queryVector
   * @returns {Promise<any|null>} — The cached result, or null on a cache miss.
   */
  async getSemanticMatch(queryVector) {
    if (!this.client) return null;

    try {
      // Scan all cache keys for this prefix
      let cursor = '0';
      do {
        const [nextCursor, keys] = await this.client.scan(cursor, 'MATCH', `${this._prefix}*`, 'COUNT', 100);
        cursor = nextCursor;

        for (const key of keys) {
          const raw = await this.client.get(key);
          if (!raw) continue;
          const { vector, result } = JSON.parse(raw);
          const similarity = MemoryEngine._cosine(queryVector, vector);
          if (similarity >= this.threshold) {
            if (this.debug) console.log(`[RedisProvider] Cache HIT — cosine: ${similarity.toFixed(4)}`);
            return result;
          }
        }
      } while (cursor !== '0');
    } catch (err) {
      // Never crash the main pipeline on cache errors — fail silently
      if (this.debug) console.warn(`[RedisProvider] Cache scan error: ${err.message}`);
    }

    return null;
  }

  /**
   * Warms the Redis cache with a query vector and its result.
   *
   * @param {number[]} queryVector
   * @param {any} result
   */
  async set(queryVector, result) {
    if (!this.client) return;

    try {
      const key     = `${this._prefix}${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const payload = JSON.stringify({ vector: queryVector, result });
      await this.client.set(key, payload, 'EX', this.ttl);
      if (this.debug) console.log(`[RedisProvider] Cache WARM — key: ${key}, TTL: ${this.ttl}s`);
    } catch (err) {
      if (this.debug) console.warn(`[RedisProvider] Cache write error: ${err.message}`);
    }
  }

  /**
   * Clears all ManasDB cache entries from Redis.
   */
  async clear() {
    if (!this.client) return;
    let cursor = '0';
    do {
      const [nextCursor, keys] = await this.client.scan(cursor, 'MATCH', `${this._prefix}*`, 'COUNT', 100);
      cursor = nextCursor;
      if (keys.length > 0) await this.client.del(...keys);
    } while (cursor !== '0');
    if (this.debug) console.log('[RedisProvider] Cache cleared.');
  }

  /**
   * Health check — returns true if Redis is responding.
   */
  async health() {
    if (!this.client) return false;
    try {
      const pong = await this.client.ping();
      return pong === 'PONG';
    } catch {
      return false;
    }
  }

  /**
   * Gracefully closes the Redis connection.
   */
  async close() {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      if (this.debug) console.log('[RedisProvider] Connection closed.');
    }
  }
}

export default RedisProvider;
