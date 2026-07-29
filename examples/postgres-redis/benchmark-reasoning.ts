import 'dotenv/config';
import ManasDB from '../../src/index.ts';

const LARGE_ARTICLE = `
The exploration of the deep sea is one of the most challenging and fascinating endeavors of modern science. Covering more than 70 percent of the Earth's surface, the oceans reach average depths of approximately 3,682 meters. The deepest known point, the Challenger Deep in the Mariana Trench, plunges to a staggering 10,935 meters below sea level. For centuries, the deep ocean was thought to be a barren wasteland, devoid of life due to the crushing pressure and complete lack of sunlight. This long-held belief was known as the Azoic hypothesis, formulated by Edward Forbes in the 1840s, which stated that marine life could not exist below 550 meters. However, the paradigm completely shifted in the late 19th century. 
`;

const QUERIES = [
    "What is the deepest known point in the ocean?",
    "Who formulated the Azoic hypothesis and what did it state?"
];

async function runBenchmark() {
    console.log("=====================================================");
    console.log(" MANASDB: POSTGRES + REDIS (REASONING BENCHMARK)");
    console.log("=====================================================\n");

    const projectName = 'reasoning_pg_bench_' + Date.now();

    const db = new ManasDB({
        uri: process.env.POSTGRES_URI,
        projectName: projectName,
        cache: {
            provider: 'redis',
            uri: process.env.REDIS_URI || 'redis://localhost:6379',
            semanticThreshold: 0.92,
            ttl: 300
        },
        reasoning: { enabled: true },
        telemetry: false
    });

    await db.init();
    console.log(`[+] Initialized PostgreSQL connection.`);
    console.log(`[+] Initialized Redis cache tier (Tier 1).\n`);

    const absorbRes = await db.absorb(LARGE_ARTICLE, { });
    db.buildReasoningIndex(absorbRes.rawChunks);

    const tableData: any[] = [];

    for (let i = 0; i < QUERIES.length; i++) {
        const query = QUERIES[i];

        const t0 = performance.now();
        const res1 = await db.reasoningRecall(query, { topSections: 3 });
        const t1 = performance.now();
        const dbLatency = (t1 - t0);

        await new Promise(r => setTimeout(r, 100));

        const t2 = performance.now();
        const res2 = await db.reasoningRecall(query, { topSections: 3 });
        const t3 = performance.now();
        const redisLatency = (t3 - t2);

        const t4 = performance.now();
        const res3 = await db.reasoningRecall(query, { topSections: 3 });
        const t5 = performance.now();
        const lruLatency = (t5 - t4);

        const speedup = (dbLatency / lruLatency).toFixed(1);

        tableData.push({
            "Query #": i + 1,
            "Reasoning Postgres": `${dbLatency.toFixed(1)}ms`,
            "Tier 1 (Redis)": `${redisLatency.toFixed(1)}ms`,
            "Tier 2 (LRU)": `${lruLatency.toFixed(1)}ms`,
            "Speedup": `${speedup}x`
        });
    }

    console.table(tableData);
    await db.close();
}

runBenchmark().catch(console.error);
