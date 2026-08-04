import MemoryProvider from '../../src/providers/memory.ts';
import MongoProvider from '../../src/providers/mongodb.ts';
import PostgresProvider from '../../src/providers/postgres.ts';
import RedisProvider from '../../src/providers/redis.ts';
import { createProvider, createProviders, createCacheProvider, inferTypeFromUri } from '../../src/providers/factory.ts';
import assert from 'assert';

console.log('=====================================================');
console.log('RUNNING TYPESCRIPT STORAGE PROVIDERS TESTS (v0.4.5)');
console.log('=====================================================');

// 1. MemoryProvider Test
console.log('\n[1/5] Testing MemoryProvider.ts...');
const memProvider = new MemoryProvider(undefined, undefined, 'test-project', true);
await memProvider.init();

const mockAiProvider = {
  embed: async (text: string) => ({ vector: [0.1, 0.2, 0.3], dims: 3 })
};

const insertRes = await memProvider.insert({
  rawText: 'Memory test content paragraph',
  chunks: [{ text: 'Memory test content paragraph', embedText: 'Memory test content paragraph' }],
  aiProvider: mockAiProvider
});

assert.strictEqual(insertRes.chunksInserted, 1);

const searchResults = await memProvider.vectorSearch({
  queryVector: [0.1, 0.2, 0.3],
  limit: 5,
  minScore: 0.1
});

assert.strictEqual(searchResults.length, 1);
assert(searchResults[0].score > 0.9);

const listDocs = await memProvider.list(10);
assert.strictEqual(listDocs.length, 1);

const deleteRes = await memProvider.delete(insertRes.documentId);
assert.strictEqual(deleteRes.deleted, true);
console.log('  ✔️ MemoryProvider.ts fully functional!');

// 2. URI Auto-detection Test
console.log('\n[2/5] Testing inferTypeFromUri in factory.ts...');
assert.strictEqual(inferTypeFromUri('mongodb+srv://cluster.mongodb.net'), 'mongodb');
assert.strictEqual(inferTypeFromUri('postgresql://user:pass@localhost:5432/db'), 'postgres');
assert.strictEqual(inferTypeFromUri('redis://localhost:6379'), 'redis');
assert.strictEqual(inferTypeFromUri(''), 'memory');
console.log('  ✔️ inferTypeFromUri passed!');

// 3. Provider Factory Test
console.log('\n[3/5] Testing Provider Factory...');
const p1 = await createProvider({ type: 'memory' }, 'app-1');
assert(p1 instanceof MemoryProvider);

const providers = await createProviders([{ type: 'memory' }, { type: 'memory' }], 'app-2');
assert.strictEqual(providers.length, 2);
assert(providers[0] instanceof MemoryProvider);
console.log('  ✔️ Provider Factory instantiation passed!');

// 4. Redis Provider Factory Test
console.log('\n[4/5] Testing Redis Cache Provider Factory...');
const redisCache = createCacheProvider({ provider: 'redis', uri: 'redis://localhost:6379', ttl: 1800, semanticThreshold: 0.95 });
assert(redisCache instanceof RedisProvider);
assert.strictEqual(redisCache.ttl, 1800);
assert.strictEqual(redisCache.threshold, 0.95);
console.log('  ✔️ Redis Cache Provider Factory passed!');

// 5. Provider Class Declarations Check
console.log('\n[5/5] Testing Mongo & Postgres Provider Class Declarations...');
const mongoInst = new MongoProvider('mongodb://localhost:27017', 'testdb', 'proj');
assert(mongoInst instanceof MongoProvider);
const pgInst = new PostgresProvider('postgresql://localhost:5432/test', 'testdb', 'proj');
assert(pgInst instanceof PostgresProvider);
console.log('  ✔️ MongoProvider.ts and PostgresProvider.ts verified!');

console.log('\n=====================================================');
console.log('ALL v0.4.5 TYPESCRIPT PROVIDER TESTS PASSED CLEANLY! ✅');
console.log('=====================================================');
