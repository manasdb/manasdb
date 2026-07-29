import 'dotenv/config';
import ManasDB from '../../src/index.ts';

const ARTICLE = `
Artificial Intelligence (AI) has rapidly transformed from a niche academic pursuit into a foundational technology driving modern industry. Early AI systems relied heavily on symbolic logic and rigid rule-based engines, which struggled with the complexity and ambiguity of the real world. The breakthrough came with the advent of deep learning and neural networks, architectures inspired by the human brain that allow machines to recognize patterns within massive datasets. 

Today, Large Language Models (LLMs) like GPT-4 and Claude are capable of understanding context, writing code, and generating human-like text with stunning accuracy. However, LLMs suffer from a critical limitation known as "hallucination," where they confidently generate false information when they lack specific knowledge. To solve this, developers use Retrieval-Augmented Generation (RAG). RAG grounds the LLM by retrieving relevant facts from a secure, private Vector Database and injecting them directly into the prompt before the AI answers.

Semantic memory systems that power RAG, such as ManasDB, rely on embedding models that map sentences into high-dimensional geometric spaces. When a user asks a question, their query is also embedded into this space, and the database mathematically searches for the closest matching "chunks" of text using Cosine Similarity.
`;

async function runBenchmark() {
    console.log("=====================================================");
    console.log(" MANASDB: MULTI-TIER LATENCY BENCHMARK");
    console.log("=====================================================\n");

    const projectName = 'benchmark_' + Date.now();

    const db = new ManasDB({
        uri: process.env.MONGODB_URI,
        dbName: 'manasdb_benchmark',
        projectName: projectName,
        cache: {
            provider: 'redis',
            uri: process.env.REDIS_URI || 'redis://localhost:6379',
            semanticThreshold: 0.92,
            ttl: 300
        },
        telemetry: false
    });

    await db.init();
    console.log(`[+] Initialized MongoDB connection.`);
    console.log(`[+] Initialized Redis cache tier (Tier 1).`);
    console.log(`[+] Initialized In-Memory LRU tier (Tier 2).\n`);

    console.log(`[1] Absorbing Benchmark Document...`);
    const absorbRes = await db.absorb(ARTICLE, { });
    console.log(`    -> Chunks processed: ${absorbRes.chunks}\n`);

    console.log(`[2] Waiting for MongoDB Atlas Vector Index to sync...`);
    await new Promise(r => setTimeout(r, 6000));
    console.log(`    -> Ready.\n`);

    const query = "What is Retrieval-Augmented Generation (RAG)?";
    console.log(`[3] Benchmarking Query: "${query}"\n`);
    
    const t0 = performance.now();
    const res1 = await db.recall(query, { limit: 1 } as any);
    const t1 = performance.now();
    const dbLatency = (t1 - t0);
    const dbHit = (res1 as any)._trace.cacheHit === false ? 'MongoDB (Vector Search)' : 'Unknown';

    await new Promise(r => setTimeout(r, 100));

    const t2 = performance.now();
    const res2 = await db.recall(query, { limit: 1 } as any);
    const t3 = performance.now();
    const redisLatency = (t3 - t2);
    const redisHit = (res2 as any)._trace.cacheHit === 'redis' ? 'Redis (Tier 1)' : 'Cache Miss';

    const t4 = performance.now();
    const res3 = await db.recall(query, { limit: 1 } as any);
    const t5 = performance.now();
    const lruLatency = (t5 - t4);
    const lruHit = ((res3 as any)._trace.cacheHit === 'memory_exact' || (res3 as any)._trace.cacheHit === 'memory') ? 'In-Memory (Tier 2)' : 'Cache Miss';

    const redisSpeedup = (dbLatency / redisLatency).toFixed(1);
    const lruSpeedup = (dbLatency / lruLatency).toFixed(1);

    const tableData = [
        { 
            "Tier": "Cold (No Cache)",
            "Data Source": dbHit, 
            "Latency (ms)": `${dbLatency.toFixed(2)}ms`,
            "Improvement": "-"
        },
        { 
            "Tier": "Tier 1 (Semantic)",
            "Data Source": redisHit, 
            "Latency (ms)": `${redisLatency.toFixed(2)}ms`,
            "Improvement": `${redisSpeedup}x Faster`
        },
        { 
            "Tier": "Tier 2 (LRU)",
            "Data Source": lruHit, 
            "Latency (ms)": `${lruLatency.toFixed(2)}ms`,
            "Improvement": `${lruSpeedup}x Faster`
        }
    ];

    console.table(tableData);
    console.log("\n=====================================================");
    console.log(" BENCHMARK COMPLETED SUCCESSFULLY");
    console.log("=====================================================");

    await db.close();
}

runBenchmark().catch(console.error);
