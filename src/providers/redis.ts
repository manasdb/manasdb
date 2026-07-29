import MemoryEngine from '../core/memory-engine.js';

export class RedisProvider {
  public uri: string;
  public ttl: number;
  public threshold: number;
  public debug: boolean;
  public client: any;
  private _prefix: string;

  constructor(uri: string, ttl = 3600, threshold = 0.92, debug = false) {
    this.uri = uri;
    this.ttl = ttl;
    this.threshold = threshold;
    this.debug = debug;
    this.client = null;
    this._prefix = 'manasdb:cache:';
  }

  async init(): Promise<void> {
    let Redis: any;
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
      maxRetriesPerRequest: 1,
      enableReadyCheck: false,
    });
    this.client.on('error', () => {});

    await this.client.connect();
    await this.client.ping();

    if (this.debug) console.log(`[RedisProvider] Connected to Redis: ${this.uri}`);
  }

  /**
   * Scans all cached entries for a vector whose cosine similarity to `queryVector`
   * exceeds the configured threshold.
   */
  async getSemanticMatch(queryVector: number[]): Promise<any | null> {
    if (!this.client) return null;

    try {
      let cursor = '0';
      do {
        const [nextCursor, keys] = await this.client.scan(cursor, 'MATCH', `${this._prefix}*`, 'COUNT', 100);
        cursor = nextCursor;

        for (const key of keys) {
          const raw = await this.client.get(key);
          if (!raw) continue;
          const { vector, result } = JSON.parse(raw);
          const similarity = (MemoryEngine as any)._cosine(queryVector, vector);
          if (similarity >= this.threshold) {
            if (this.debug) console.log(`[RedisProvider] Cache HIT — cosine: ${similarity.toFixed(4)}`);
            return result;
          }
        }
      } while (cursor !== '0');
    } catch (err: any) {
      if (this.debug) console.warn(`[RedisProvider] Cache scan error: ${err?.message}`);
    }

    return null;
  }

  /**
   * Warms the Redis cache with a query vector and its result.
   */
  async set(queryVector: number[], result: any): Promise<void> {
    if (!this.client) return;

    try {
      const key = `${this._prefix}${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const payload = JSON.stringify({ vector: queryVector, result });
      await this.client.set(key, payload, 'EX', this.ttl);
      if (this.debug) console.log(`[RedisProvider] Cache WARM — key: ${key}, TTL: ${this.ttl}s`);
    } catch (err: any) {
      if (this.debug) console.warn(`[RedisProvider] Cache write error: ${err?.message}`);
    }
  }

  /**
   * Clears all ManasDB cache entries from Redis.
   */
  async clear(): Promise<void> {
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
  async health(): Promise<boolean> {
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
  async close(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      if (this.debug) console.log('[RedisProvider] Connection closed.');
    }
  }
}

export default RedisProvider;
