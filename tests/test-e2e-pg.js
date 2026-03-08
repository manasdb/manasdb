import 'dotenv/config';
import chalk from 'chalk';
import ManasDB from '../src/index.js';
import MongoConnection from '../src/core/connection.js';

const ARTICLE_TEXT = `
Artificial intelligence (AI) is the intelligence of machines or software, as opposed to the intelligence of human beings or animals. AI applications include advanced web search engines (e.g., Google Search), recommendation systems (used by YouTube, Amazon, and Netflix), understanding human speech (such as Siri and Alexa), self-driving cars (e.g., Waymo), generative or creative tools (ChatGPT and AI art), and competing at the highest level in strategic games (such as chess and Go).

The term "artificial intelligence" had previously been used to describe machines that mimic and display "human" cognitive skills that are associated with the human mind, such as "learning" and "problem-solving". This definition has since been rejected by major AI researchers who now describe AI in terms of rationality and acting rationally, which does not limit how intelligence can be articulated.

Alan Turing was the first person to conduct substantial research in the field that he called Machine Intelligence. Artificial intelligence was founded as an academic discipline in 1956. The field went through multiple cycles of optimism, followed by periods of disappointment and loss of funding, known as AI winter. Funding and interest vastly increased after 2012 when deep learning surpassed all previous AI techniques, and after 2017 with the transformer architecture. This led to the AI spring of the early 2020s, with companies, universities, and laboratories overwhelmingly based in the United States pioneering significant advances in artificial intelligence.

In recent years, the intersection of AI and law, particularly concerning intellectual property and deepfakes, has become a hotbed of global legislative activity. Over 50 countries have drafted guidelines regarding the deployment of AI systems, most notably the European Union's AI Act which classifies systems based on acceptable risk.
`;

const E2E_QUERIES = [
    { mode: 'document', text: "Who was the first person to conduct substantial research in Machine Intelligence?", expected: "Alan Turing" },
    { mode: 'qa',       text: "What major architecture triggered deep learning advances in 2017?", expected: "transformer" },
    { mode: 'qa',       text: "How many countries have drafted AI deployment guidelines?", expected: "Over 50" },
    { mode: 'qa',       text: "Identify generative creative tools powered by AI", expected: "ChatGPT" }
];

async function runEndToEnd() {
    console.log(chalk.cyan("\n====================================================="));
    console.log(chalk.bold("[INFO] MANASDB END-TO-END (E2E) TEST SUITE"));
    console.log(chalk.cyan("=====================================================\n"));

    let db;
    try {
        const projectName = 'e2e_test_' + Date.now();
        db = new ManasDB({
            uri: process.env.POSTGRES_URI,
            // databases: [{ type: 'postgres', uri: process.env.POSTGRES_URI }],
            
            projectName: projectName,
            modelConfig: { source: 'transformers' },
            telemetry: false,
            piiShield: false
        });

        await db.init();
        console.log(chalk.green(`[SUCCESS] Connected and Initialized: ${projectName}`));

        // Step 1: Ingest large text block
        console.log(chalk.white(`\n[INFO] Step 1: Ingesting Corpus (${ARTICLE_TEXT.length} bytes)...`));
        const t0 = Date.now();
        const absorbRes = await db.absorb(ARTICLE_TEXT, { profile: 'speed', maxTokens: 80 });
        
        console.log(chalk.green(`[SUCCESS] Stored accurately in ${Date.now() - t0}ms`));
        console.log(`  └─> Created ${absorbRes.inserted[0].chunksInserted} chunks mapped to 1 parent document.\n`);

        console.log(chalk.dim("  Waiting 3 seconds for Postgres network delay..."));
        await new Promise(r => setTimeout(r, 6000));

        // Step 2: Query Battery
        console.log(chalk.white(`\n[INFO] Step 2: Running Recall Query Battery (Mode Testing)...`));
        
        let score = 0;
        let index = 1;
        
        for (const item of E2E_QUERIES) {
            console.log(chalk.yellow(`\n[QUERY ${index++}] "${item.text}"`));
            console.log(`  Mode: ${chalk.magenta(item.mode.toUpperCase())}`);
            
            const results = await db.recall(item.text, { mode: item.mode, limit: 3, profile: 'speed' });
            
            if (results.length > 0) {
                const topText = results[0].metadata.matchedChunk;
                const passed = topText.toLowerCase().includes(item.expected.toLowerCase());
                
                if (passed) {
                    console.log(`  ${chalk.green('[PASS]')} Found exact phrase: "${item.expected}"`);
                    console.log(`  ${chalk.dim('Score: ' + results[0].score)}`);
                    score++;
                } else {
                    console.log(`  ${chalk.red('[FAIL]')} Expected phrase "${item.expected}" missing.`);
                    console.log(`  Returned: "${topText.substring(0, 100)}..."`);
                }
                
                // Print explicit trace log audit
                console.log(chalk.dim(`  Trace: Cache=${results._trace.cacheHit}, RRFMerges=${results._trace.rrfMerged}`));
            } else {
                console.log(`  ${chalk.red('[FAIL]')} No chunks returned. Check Atlas index.`);
            }
        }

        console.log(chalk.cyan("\n====================================================="));
        console.log(chalk.bold(`[INFO] E2E Final Score: ${score}/${E2E_QUERIES.length} (${Math.round((score / E2E_QUERIES.length) * 100)}%)`));
        console.log(chalk.cyan("=====================================================\n"));
        
        if (score === E2E_QUERIES.length) {
            console.log(chalk.green("🎉 ALL END-TO-END TESTS PASSED!"));
            process.exit(0);
        } else {
            console.log(chalk.red("❌ SOME END-TO-END TESTS FAILED."));
            process.exit(1);
        }

    } catch (err) {
        console.error(chalk.red("[ERROR]"), err);
        process.exit(1);
    } finally {
        if (db) await db.close();
    }
}

runEndToEnd();
