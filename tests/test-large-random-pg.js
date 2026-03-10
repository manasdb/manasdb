import 'dotenv/config';
import ManasDB from '../src/index.js';
import MongoConnection from '../src/core/connection.js';

const ARTICLE_TEXT = `
The exploration of the deep sea is one of the most challenging and fascinating endeavors of modern science. Covering more than 70 percent of the Earth's surface, the oceans reach average depths of approximately 3,682 meters. The deepest known point, the Challenger Deep in the Mariana Trench, plunges to a staggering 10,935 meters below sea level. For centuries, the deep ocean was thought to be a barren wasteland, devoid of life due to the crushing pressure and complete lack of sunlight. This long-held belief was known as the Azoic hypothesis, formulated by Edward Forbes in the 1840s, which stated that marine life could not exist below 550 meters. However, the paradigm completely shifted in the late 19th century. 

The HMS Challenger expedition, which sailed from 1872 to 1876, was a groundbreaking scientific mission that laid the foundation for modern oceanography. Led by Charles Wyville Thomson, the expedition traveled nearly 130,000 kilometers across the world's oceans. During this four-year journey, scientists on board discovered over 4,700 new species of marine life. They utilized specialized dredging equipment to pull up organisms from depths previously thought uninhabitable. The expedition also made the first systematic recordings of ocean temperatures, currents, and water chemistry at various depths. They discovered that the ocean floor was not entirely flat but featured massive underwater mountain ranges and deep trenches. 

In the 20th century, technological advancements allowed humans to directly observe the deep sea. William Beebe and Otis Barton made history in 1934 by descending in the Bathysphere, a spherical steel submersible, to a depth of 923 meters. Through tiny quartz windows, they observed bioluminescent creatures that had never been seen alive in their natural habitat before. Decades later, in 1960, Jacques Piccard and US Navy Lieutenant Don Walsh achieved the ultimate milestone by descending to the bottom of the Challenger Deep in the bathyscaphe Trieste. The journey down took nearly five hours, and upon reaching the bottom, they observed flatfish and shrimp, proving once and for all that complex life could survive the immense pressure of the ocean's deepest trenches.

One of the most profound discoveries in deep-sea exploration occurred in 1977. Geologists mapping the Galapagos Rift aboard the submersible Alvin discovered hydrothermal vents. These geyser-like structures spew superheated, mineral-rich water from beneath the Earth's crust into the freezing ocean. To the astonishment of the scientific community, these vents were teeming with life, including giant tube worms, blind shrimp, and unique species of crabs. This discovery fundamentally altered biology because the entire ecosystem relied not on photosynthesis, but on chemosynthesis. Bacteria living on and around the vents convert toxic hydrogen sulfide gas into organic matter, serving as the base of a food web completely independent of the sun. 

Modern deep-sea exploration heavily relies on Remotely Operated Vehicles (ROVs) and Autonomous Underwater Vehicles (AUVs). ROVs, such as the famous Jason and Hercules, are tethered to a surface ship and piloted by scientists using real-time video feeds. They are equipped with manipulator arms to collect geological and biological samples with precision. AUVs, on the other hand, are untethered robots programmed to map the seafloor using sidescan sonar and multibeam echo sounders without direct human control. These autonomous probes can map thousands of square kilometers of ocean floor in a single deployment. Despite these incredible technological leaps, it is estimated that more than 80 percent of the world's oceans remain unmapped, unobserved, and unexplored. 
`;

const QUERIES = [
    { text: "What formulation stated life couldn't exist below 550 meters?", expected: "Azoic hypothesis" },
    { text: "Who formulated the Azoic hypothesis?", expected: "Edward Forbes" },
    { text: "What is the deepest known point in the ocean?", expected: "Challenger Deep" },
    { text: "How many new species were discovered during the Challenger expedition?", expected: "4,700" },
    { text: "What vessel descended to 923 meters in 1934?", expected: "Bathysphere" },
    { text: "Who descended to the bottom of the Challenger Deep in 1960?", expected: "Jacques Piccard" },
    { text: "In what year were hydrothermal vents discovered?", expected: "1977" },
    { text: "What biological process forms the food web at hydrothermal vents?", expected: "chemosynthesis" },
    { text: "What does AUV stand for?", expected: "Autonomous Underwater Vehicles" },
    { text: "What percentage of the world's oceans currently remain unexplored?", expected: "80 percent" }
];

async function runRandomTextTest() {
    console.log("=====================================================");
    console.log("[INFO] MANASDB LARGE RANDOM TEXT QA TEST");
    console.log("=====================================================");

    const projectName = 'large_random_test_' + Date.now();
    let db;
    try {
        db = new ManasDB({
            databases: [{ type: 'postgres', uri: process.env.POSTGRES_URI }],
            
            projectName: projectName,
            modelConfig: { source: 'transformers' },
            telemetry: true
        });

        await db.init();
        console.log(`[INFO] Initialised project: ${projectName}`);
        console.log(`[INFO] Step 1: Absorbing 50+ sentence document...`);
        console.log(`[INFO] Total Document Length: ${ARTICLE_TEXT.length} characters\n`);

        const t0 = Date.now();
        // Using balanced profile, which maps to 512 dimensions for embeddings (if supported by registry, Ollama returns native dimension size and pads/trims).
        const absorbRes = await db.absorb(ARTICLE_TEXT, { profile: 'accuracy' });
        
        console.log(`[STATUS] Absorb Complete in ${Date.now() - t0}ms`);
        console.log(`[STATUS] Processed ${absorbRes.inserted[0].chunksInserted} chunks.\n`);

        // Wait to make sure Atlas indexes the vectors correctly
        console.log(`[INFO] Waiting 3 seconds for Postgres network delay...`);
        await new Promise(r => setTimeout(r, 8000));

        console.log(`\n[INFO] Step 2: Executing Query Battery...`);
        
        let score = 0;
        for (const item of QUERIES) {
            console.log(`[QUERY] "${item.text}"`);
            
            // Perform Recall 
            const results = await db.recall(item.text, { mode: 'document', limit: 3, minScore: 0.05, profile: 'accuracy' });
            
            if (results.length > 0) {
                let passed = false;
                let topText = '';
                let bestScore = 'N/A';

                for (let i = 0; i < results.length; i++) {
                    const chunkText = results[i].metadata.matchedChunk;
                    if (chunkText.toLowerCase().includes(item.expected.toLowerCase())) {
                        passed = true;
                        topText = chunkText;
                        bestScore = results[i].score?.toFixed(4) || 'N/A';
                        break;
                    }
                }

                if (!passed) {
                    topText = results[0].metadata.matchedChunk; // fallback for logs
                }
                
                if (passed) {
                    console.log(`  [PASS] Found expected phrase: "${item.expected}"`);
                    console.log(`  [MATCHED CHUNK] "${topText}"`);
                    console.log(`  [SCORE] Match Score: ${bestScore}`);
                    score++;
                } else {
                    console.log(`  [FAIL] Expected phrase "${item.expected}" not found in top 3 chunks.`);
                    console.log(`  [RETURNED CHUNK 1] "${topText}"`);
                }
            } else {
                console.log(`  [FAIL] No chunks retrieved! Either indexing delay or algorithm fault.`);
            }
            console.log("------------------------------------------");
        }

        console.log(`\n=====================================================`);
        console.log(`[INFO] Test Suite Score: ${score}/${QUERIES.length} (${Math.round((score / QUERIES.length) * 100)}%)`);
        console.log(`=====================================================\n`);
        
        if (score === QUERIES.length) {
            console.log("🎉 ALL TESTS PASSED!");
            process.exit(0);
        } else {
            console.error("❌ SOME TESTS FAILED.");
            process.exit(1);
        }

    } catch (err) {
        console.error("[ERROR]", err);
        process.exit(1);
    } finally {
        if (db) await db.close();
    }
}

runRandomTextTest();
