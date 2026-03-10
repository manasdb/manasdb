import 'dotenv/config';
import chalk from 'chalk';
import ManasDB from '../src/index.js';
import MongoConnection from '../src/core/connection.js';

const TEST_TEXT_1 = `
Acme Corp recently hired John Doe. His direct email is john.doe@acmecorp.com and his phone number is (800) 555-0199. 
The internal API key is sk-live-12345abcdef67890.
Please contact him immediately about the server migration.
`;

const TEST_TEXT_2 = `
The quick brown fox jumps over the lazy dog. This sentence contains every letter in the alphabet.
This exact text will be inserted twice to test the deduplication engine.
`;

async function runFeaturesTest() {
    console.log(chalk.cyan("\n====================================================="));
    console.log(chalk.bold("[INFO] MANASDB ENTERPRISE FEATURES TEST SUITE"));
    console.log(chalk.cyan("=====================================================\n"));

    let db;
    try {
        const projectName = 'feature_test_' + Date.now();
        db = new ManasDB({
            uri: process.env.MONGODB_URI,
            dbName: 'manasdb_test',
            projectName: projectName,
            modelConfig: { source: 'transformers' },
            telemetry: false,
            piiShield: true // Enable PII Redaction
        });

        await db.init();
        console.log(`[INFO] Initialized project: ${projectName}\n`);

        let passed = 0;
        let total = 0;

        const assert = (condition, successMsg, failMsg) => {
            total++;
            if (condition) {
                console.log(chalk.green(`  [PASS] ${successMsg}`));
                passed++;
            } else {
                console.log(chalk.red(`  [FAIL] ${failMsg}`));
            }
        };

        // ------------------------------------------------------------------
        console.log(chalk.yellow("Test 1: PII Shielding (Emails, Phones, Secrets)"));
        const absorb1 = await db.absorb(TEST_TEXT_1, { profile: 'speed' });
        
        // Let's directly query the chunk to verify it was redacted before storage
        const chunkCol = MongoConnection.getDb().collection('_manas_chunks');
        const chunkDoc = await chunkCol.findOne({ document_id: absorb1.contentId });
        
        assert(
            chunkDoc.text.includes('[EMAIL]'), 
            "Email successfully redacted to [EMAIL]", 
            "Email redaction failed: " + chunkDoc.text
        );
        assert(
            chunkDoc.text.includes('[PHONE]'), 
            "Phone successfully redacted to [PHONE]", 
            "Phone redaction failed"
        );
        assert(
            chunkDoc.text.includes('[SECRET]'), 
            "API Key successfully redacted to [SECRET]", 
            "API Key redaction failed"
        );

        // ------------------------------------------------------------------
        console.log(chalk.yellow("\nTest 2: Deduplication Engine (Concurrent & Sequential)"));
        
        // Absorb the same text twice sequentially
        const dedup1 = await db.absorb(TEST_TEXT_2, { profile: 'speed' });
        const dedup2 = await db.absorb(TEST_TEXT_2, { profile: 'speed' });

        assert(
            dedup1.contentId.toString() === dedup2.contentId.toString(),
            "Sequential deduplication successful: same content_id returned",
            "Sequential deduplication failed: " + dedup1.contentId + " !== " + dedup2.contentId
        );

        // ------------------------------------------------------------------
        console.log(chalk.yellow("\nTest 3: Semantic Cache"));
        
        // Wait for index
        console.log(chalk.dim("  Waiting 5 seconds for vector index sync..."));
        await new Promise(r => setTimeout(r, 5000));

        const queryText = "What is the contact information for John Doe?";
        // First recall should hit the database
        const recall1 = await db.recall(queryText, { mode: 'qa', limit: 3 });
        console.log("RECALL 1 LENGTH:", recall1.length);
        if(recall1.length) console.log("RECALL 1 [0]:", recall1[0].text);
        assert(
            recall1._trace.cacheHit === false,
            "Initial recall correctly bypassed cache",
            "Initial recall incorrectly registered a cache hit"
        );

        // Second recall should hit the exact cache
        const recall2 = await db.recall(queryText, { mode: 'qa', limit: 3 });
        assert(
            !!recall2._trace.cacheHit,
            "Subsequent exact recall successfully hit semantic cache",
            "Subsequent recall missed cache"
        );

        // ------------------------------------------------------------------
        console.log(chalk.yellow("\nTest 4: Cost Calculator & Telemetry Trace"));
        console.log(chalk.dim("  Query Tokens: " + recall1._trace.tokens));
        console.log(chalk.dim("  Query Cost:   $" + recall1._trace.costUSD));
        assert(
            recall1._trace.tokens !== undefined && recall1._trace.costUSD !== undefined,
            "Cost Calculator emitted tokens and cost into _trace payload",
            "Cost Calculator missing from trace payload"
        );

        // ------------------------------------------------------------------
        console.log(chalk.cyan("\n====================================================="));
        console.log(chalk.bold(`[INFO] Feature Test Score: ${passed}/${total} (${Math.round((passed / total) * 100)}%)`));
        console.log(chalk.cyan("=====================================================\n"));
        
        if (passed === total) {
            console.log(chalk.green("🎉 ALL FEATURE TESTS PASSED!"));
            process.exit(0);
        } else {
            console.log(chalk.red("❌ SOME FEATURE TESTS FAILED."));
            process.exit(1);
        }

    } catch (err) {
        console.error(chalk.red("[ERROR]"), err);
        process.exit(1);
    } finally {
        await MongoConnection.disconnect();
    }
}

runFeaturesTest();
