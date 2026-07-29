import 'dotenv/config';
import ManasDB from '../../src/index.ts';

const LARGE_ARTICLE = `
The exploration of the deep sea is one of the most challenging and fascinating endeavors of modern science. Covering more than 70 percent of the Earth's surface, the oceans reach average depths of approximately 3,682 meters. The deepest known point, the Challenger Deep in the Mariana Trench, plunges to a staggering 10,935 meters below sea level. For centuries, the deep ocean was thought to be a barren wasteland, devoid of life due to the crushing pressure and complete lack of sunlight. This long-held belief was known as the Azoic hypothesis, formulated by Edward Forbes in the 1840s, which stated that marine life could not exist below 550 meters. However, the paradigm completely shifted in the late 19th century. 

The HMS Challenger expedition, which sailed from 1872 to 1876, was a groundbreaking scientific mission that laid the foundation for modern oceanography. Led by Charles Wyville Thomson, the expedition traveled nearly 130,000 kilometers across the world's oceans. During this four-year journey, scientists on board discovered over 4,700 new species of marine life. They utilized specialized dredging equipment to pull up organisms from depths previously thought uninhabitable. The expedition also made the first systematic recordings of ocean temperatures, currents, and water chemistry at various depths. They discovered that the ocean floor was not entirely flat but featured massive underwater mountain ranges and deep trenches. 

In the 20th century, technological advancements allowed humans to directly observe the deep sea. William Beebe and Otis Barton made history in 1934 by descending in the Bathysphere, a spherical steel submersible, to a depth of 923 meters. Through tiny quartz windows, they observed bioluminescent creatures that had never been seen alive in their natural habitat before. Decades later, in 1960, Jacques Piccard and US Navy Lieutenant Don Walsh achieved the ultimate milestone by descending to the bottom of the Challenger Deep in the bathyscaphe Trieste. The journey down took nearly five hours, and upon reaching the bottom, they observed flatfish and shrimp, proving once and for all that complex life could survive the immense pressure of the ocean's deepest trenches.

One of the most profound discoveries in deep-sea exploration occurred in 1977. Geologists mapping the Galapagos Rift aboard the submersible Alvin discovered hydrothermal vents. These geyser-like structures spew superheated, mineral-rich water from beneath the Earth's crust into the freezing ocean. To the astonishment of the scientific community, these vents were teeming with life, including giant tube worms, blind shrimp, and unique species of crabs. This discovery fundamentally altered biology because the entire ecosystem relied not on photosynthesis, but on chemosynthesis. Bacteria living on and around the vents convert toxic hydrogen sulfide gas into organic matter, serving as the base of a food web completely independent of the sun. 

Modern deep-sea exploration heavily relies on Remotely Operated Vehicles (ROVs) and Autonomous Underwater Vehicles (AUVs). ROVs, such as the famous Jason and Hercules, are tethered to a surface ship and piloted by scientists using real-time video feeds. They are equipped with manipulator arms to collect geological and biological samples with precision. AUVs, on the other hand, are untethered robots programmed to map the seafloor using sidescan sonar and multibeam echo sounders without direct human control. These autonomous probes can map thousands of square kilometers of ocean floor in a single deployment. Despite these incredible technological leaps, it is estimated that more than 80 percent of the world's oceans remain unmapped, unobserved, and unexplored. 
`;

const QUERIES = [
    "What is the deepest known point in the ocean?",
    "Who formulated the Azoic hypothesis and what did it state?",
    "What did scientists discover about hydrothermal vents in 1977?",
    "How do AUVs map the ocean floor?",
    "Who descended in the Bathysphere in 1934?"
];

async function runBenchmark() {
    console.log("=====================================================");
    console.log(" MANASDB: MONGODB + REDIS (REASONING BENCHMARK)");
    console.log("=====================================================\n");

    const projectName = 'reasoning_bench_' + Date.now();

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
        reasoning: { enabled: true },
        telemetry: false
    });

    await db.init();
    console.log(`[+] Initialized MongoDB connection.`);
    console.log(`[+] Initialized Redis cache tier (Tier 1).\n`);

    console.log(`[1] Absorbing Large Benchmark Document (${LARGE_ARTICLE.length} chars)...`);
    const absorbRes = await db.absorb(LARGE_ARTICLE, { });
    console.log(`    -> Chunks processed: ${absorbRes.chunks}\n`);

    console.log(`[2] Building Hierarchical Tree Index...`);
    db.buildReasoningIndex(absorbRes.rawChunks);

    console.log(`[3] Waiting 8 seconds for MongoDB Atlas Vector Index to sync...\n`);
    await new Promise(r => setTimeout(r, 8000));

    console.log(`[4] Running Complex Tree-Reasoning Query Workload...\n`);

    const tableData: any[] = [];

    for (let i = 0; i < QUERIES.length; i++) {
        const query = QUERIES[i];

        const t0 = performance.now();
        const res1 = await db.reasoningRecall(query, { topSections: 3 });
        const t1 = performance.now();
        const reasoningDbLatency = (t1 - t0);

        await new Promise(r => setTimeout(r, 100));

        const t2 = performance.now();
        const res2 = await db.reasoningRecall(query, { topSections: 3 });
        const t3 = performance.now();
        const redisLatency = (t3 - t2);

        const t4 = performance.now();
        const res3 = await db.reasoningRecall(query, { topSections: 3 });
        const t5 = performance.now();
        const lruLatency = (t5 - t4);

        const speedup = (reasoningDbLatency / lruLatency).toFixed(1);

        tableData.push({
            "Query #": i + 1,
            "Reasoning DB": `${reasoningDbLatency.toFixed(1)}ms`,
            "Tier 1 (Redis)": `${redisLatency.toFixed(1)}ms`,
            "Tier 2 (LRU)": `${lruLatency.toFixed(1)}ms`,
            "Speedup": `${speedup}x`
        });
    }

    console.table(tableData);
    console.log("\n=====================================================");
    console.log(" REASONING BENCHMARK COMPLETED SUCCESSFULLY");
    console.log("=====================================================");

    await db.close();
}

runBenchmark().catch(console.error);
