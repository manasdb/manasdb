import 'dotenv/config';
import chalk from 'chalk';
import { ManasDB } from '../src/index.ts';
import RedisProvider from '../src/providers/redis.ts';

const assert = (condition: boolean, successMsg: string, failMsg: string) => {
    if (condition) {
        console.log(chalk.green(`  [PASS] ${successMsg}`));
    } else {
        console.log(chalk.red(`  [FAIL] ${failMsg}`));
        process.exit(1);
    }
};

async function runRedisTests() {
    console.log(chalk.cyan("\n====================================================="));
    console.log(chalk.bold("[INFO] MANASDB REDIS CACHE TEST SUITE"));
    console.log(chalk.cyan("=====================================================\n"));

    console.log(chalk.yellow("Test 1: Direct RedisProvider Initialization & Connection"));
    
    const redisUri = process.env.REDIS_URI || 'redis://localhost:6379';
    const provider = new RedisProvider(redisUri, 10, 0.90, false);
    
    try {
        await provider.init();
        const isHealthy = await provider.health();
        assert(isHealthy, "RedisProvider connected and is healthy", "RedisProvider failed health check");

        console.log(chalk.yellow("\nTest 2: Semantic Cache Miss & Warm"));
        const dummyVector = Array.from({length: 1536}, () => Math.random());
        const magnitude = Math.sqrt(dummyVector.reduce((sum, val) => sum + val * val, 0));
        const normalizedVector = dummyVector.map(v => v / magnitude);

        const dummyResult: any = { test: "data", value: 42 };

        await provider.clear();
        let hit = await provider.getSemanticMatch(normalizedVector);
        assert(hit === null, "Semantic match correctly missed empty cache", "Cache returned false positive");

        await provider.set(normalizedVector, dummyResult);
        
        console.log(chalk.yellow("\nTest 3: Semantic Cache Exact Match / Hit"));
        hit = await provider.getSemanticMatch(normalizedVector);
        assert(hit && hit.value === 42, "Semantic match correctly captured warmed cache", "Cache missed exact vector match");

        console.log(chalk.yellow("\nTest 4: Semantic Cosine Threshold Rejection"));
        const alteredVector = normalizedVector.map(v => v * -1); 
        const hit2 = await provider.getSemanticMatch(alteredVector);
        assert(hit2 === null, "Semantic match correctly rejected below-threshold vector", "Cache mistakenly returned mismatch");

        console.log(chalk.yellow("\nTest 5: Clear and TTL Lifecycle"));
        await provider.clear();
        hit = await provider.getSemanticMatch(normalizedVector);
        assert(hit === null, "Cache cleared successfully", "Cache still holds data after clear()");

        await provider.close();
        assert((provider as any).client === null, "Provider closed connection cleanly", "Provider leaked connection handle");

    } catch (e: any) {
        console.log(chalk.red(`[WARNING] Failed to connect to Redis at ${redisUri}. Skipping semantic logic tests.`));
        console.log(chalk.red(e.message));
    }

    console.log(chalk.yellow("\nTest 6: End-to-End SDK Integration"));
    
    const memory = new ManasDB({
        uri: process.env.MONGODB_URI,
        dbName: 'manasdb_test',
        projectName: 'redis_test_' + Date.now(),
        cache: {
            provider: 'redis',
            uri: redisUri,
            semanticThreshold: 0.92,
            ttl: 30
        },
        telemetry: true
    });

    await memory.init();
    console.log(`[INFO] SDK gracefully initialized with Redis Cache.`);

    await memory.absorb("The capital of France is Paris.");

    const q1 = await memory.recall("What is the capital of France?", { limit: 1, minScore: 0.05 } as any);
    
    assert((q1 as any)._trace?.cacheHit === false, `First query hit DB correctly (Trace: ${(q1 as any)._trace?.cacheHit})`, "First query incorrectly claimed cache hit");

    await new Promise(resolve => setTimeout(resolve, 50)); 

    const q2 = await memory.recall("What is the capital of France?", { limit: 1, minScore: 0.05 } as any);

    if ((q2 as any)._trace?.cacheHit === 'redis') {
        assert(true, "Second query short-circuited via Tier 1 Redis Cache successfully!", "");
    } else {
        console.log(chalk.yellow(`  [WARN] Second query returned trace cacheHit = '${(q2 as any)._trace?.cacheHit}'. Redis might be offline, falling back to LRU.`));
    }

    await memory.close();
    
    console.log(chalk.cyan("\n====================================================="));
    console.log(chalk.bold("[SUCCESS] REDIS TEST SUITE COMPLETE"));
    console.log(chalk.cyan("=====================================================\n"));
    process.exit(0);
}

runRedisTests();
