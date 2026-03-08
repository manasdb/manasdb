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
    console.log(chalk.bold("[INFO] MANASDB POLYGLOT FEATURES TEST SUITE"));
    console.log(chalk.cyan("=====================================================\n"));

    let db;
    try {
        const projectName = 'poly_feature_' + Date.now();
        db = new ManasDB({
            databases: [
                { type: 'mongodb', uri: process.env.MONGODB_URI, dbName: 'manasdb_test' },
                { type: 'postgres', uri: process.env.POSTGRES_URI }
            ],
            projectName: projectName,
            modelConfig: { source: 'transformers' },
            piiShield: { enabled: true },
            telemetry: true
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
        
        // Verifying PII through MongoDB
        const chunkCol = MongoConnection.getDb().collection('_manas_chunks');
        // We know it returns multiple contentIds from polyglot.
        const parentMongoId = absorb1.inserted.find(i => i.database === 'mongodb').contentId;
        const chunkDoc = await chunkCol.findOne({ document_id: parentMongoId });
        
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

        const d1_pg = dedup1.inserted.find(i => i.database === 'postgres').contentId;
        const d2_pg = dedup2.inserted.find(i => i.database === 'postgres').contentId;

        assert(
            d1_pg === d2_pg,
            "Sequential deduplication successful across PostgreSQL",
            "Sequential deduplication failed: " + d1_pg + " !== " + d2_pg
        );

        // ------------------------------------------------------------------
        console.log(chalk.yellow("\nTest 3: Semantic Cache"));
        
        // Wait for index
        console.log(chalk.dim("  Waiting 5 seconds for vector index sync..."));
        await new Promise(r => setTimeout(r, 5000));

        const queryText = "What is the contact information for John Doe?";
        // First recall should hit the databases
        const recall1 = await db.recall(queryText, { mode: 'qa', limit: 3 });
        console.log("RECALL 1 LENGTH:", recall1.length);
        assert(
            recall1._trace.cacheHit === false,
            "Initial recall correctly bypassed cache",
            "Initial recall falsely hit cache"
        );

        // Second duplicate EXACT recall should instantly hit the Semantic LRU Cache
        const recall2 = await db.recall(queryText, { mode: 'qa', limit: 3 });
        assert(
            recall2._trace.cacheHit === true,
            "Subsequent exact recall successfully hit semantic cache",
            "Subsequent recall missed cache"
        );

        console.log(chalk.cyan("\n====================================================="));
        console.log(chalk.bold(`[INFO] Feature Test Score: ${passed}/${total} (${Math.round((passed / total) * 100)}%)`));
        console.log(chalk.cyan("=====================================================\n"));
        
        if (passed === total) {
            console.log('🎉 ALL POLYGLOT FEATURE TESTS PASSED!');
            setTimeout(() => process.exit(0), 500);
        } else {
            console.log(chalk.red("❌ SOME POLYGLOT FEATURE TESTS FAILED."));
            process.exit(1);
        }

    } catch (err) {
        console.error(chalk.red("[ERROR]"), err);
        process.exit(1);
    } finally {
        if (db) await db.close();
    }
}

runFeaturesTest();
