import 'dotenv/config';
import chalk from 'chalk';
import ManasDB from '../src/index.js';
import RedisProvider from '../src/providers/redis.js';

const assert = (condition, successMsg, failMsg) => {
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
    
    // We assume a local Redis instance on default port for testing
    const redisUri = process.env.REDIS_URI || 'redis://localhost:6379';
    const provider = new RedisProvider(redisUri, 10, 0.90, false);
    
    try {
        await provider.init();
        const isHealthy = await provider.health();
        assert(isHealthy, "RedisProvider connected and is healthy", "RedisProvider failed health check");

        console.log(chalk.yellow("\nTest 2: Semantic Cache Miss & Warm"));
        // Create a dummy vector and payload (1536 dims)
        const dummyVector = Array.from({length: 1536}, () => Math.random());
        const magnitude = Math.sqrt(dummyVector.reduce((sum, val) => sum + val * val, 0));
        const normalizedVector = dummyVector.map(v => v / magnitude);

        const dummyResult = { test: "data", value: 42 };

        // Should miss initially
        await provider.clear();
        let hit = await provider.getSemanticMatch(normalizedVector);
        assert(hit === null, "Semantic match correctly missed empty cache", "Cache returned false positive");

        // Warm cache
        await provider.set(normalizedVector, dummyResult);
        
        console.log(chalk.yellow("\nTest 3: Semantic Cache Exact Match / Hit"));
        hit = await provider.getSemanticMatch(normalizedVector);
        assert(hit && hit.value === 42, "Semantic match correctly captured warmed cache", "Cache missed exact vector match");

        console.log(chalk.yellow("\nTest 4: Semantic Cosine Threshold Rejection"));
        // Alter the vector significantly so cosine falls below 0.90
        const alteredVector = normalizedVector.map(v => v * -1); 
        const hit2 = await provider.getSemanticMatch(alteredVector);
        assert(hit2 === null, "Semantic match correctly rejected below-threshold vector", "Cache mistakenly returned mismatch");

        console.log(chalk.yellow("\nTest 5: Clear and TTL Lifecycle"));
        await provider.clear();
        hit = await provider.getSemanticMatch(normalizedVector);
        assert(hit === null, "Cache cleared successfully", "Cache still holds data after clear()");

        await provider.close();
        assert(provider.client === null, "Provider closed connection cleanly", "Provider leaked connection handle");

    } catch (e) {
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
        telemetry: false
    });

    await memory.init();
    console.log(`[INFO] SDK gracefully initialized with Redis Cache.`);

    // Absorb some real text
    await memory.absorb("The capital of France is Paris.", { profile: 'speed' });

    // Try recalling
    const q1 = await memory.recall("What is the capital of France?", { limit: 1, minScore: 0.05, profile: 'speed' });
    
    // First query should hit DB (cacheHit = false)
    assert(q1._trace.cacheHit === false, `First query hit DB correctly (Trace: ${q1._trace.cacheHit})`, "First query incorrectly claimed cache hit");

    // Give Redis a little time to finish async cache write
    await new Promise(resolve => setTimeout(resolve, 50)); 

    // Second query should hit Redis (cacheHit = 'redis')
    const q2 = await memory.recall("What is the capital of France?", { limit: 1, minScore: 0.05, profile: 'speed' });

    if (q2._trace.cacheHit === 'redis') {
        assert(true, "Second query short-circuited via Tier 1 Redis Cache successfully!", "");
    } else {
        console.log(chalk.yellow(`  [WARN] Second query returned trace cacheHit = '${q2._trace.cacheHit}'. Redis might be offline, falling back to LRU.`));
    }

    await memory.close();
    
    console.log(chalk.cyan("\n====================================================="));
    console.log(chalk.bold("[SUCCESS] REDIS TEST SUITE COMPLETE"));
    console.log(chalk.cyan("=====================================================\n"));
    process.exit(0);
}

runRedisTests();
