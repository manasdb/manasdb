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
            databases: [{ type: 'postgres', uri: process.env.POSTGRES_URI }],
            
            projectName: projectName,
            modelConfig: { source: 'transformers' },
            telemetry: true,
            piiShield: true 
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

        console.log(chalk.yellow("Test 1: PII Shielding (Emails, Phones, Secrets)"));
        const absorb1 = await db.absorb(TEST_TEXT_1, { profile: 'speed' });
        
        const client = await db.databaseDrivers[0].pool.connect();
        const chunkDocRes = await client.query('SELECT text FROM _manas_chunks WHERE document_id = $1 LIMIT 1', [absorb1.inserted[0].contentId]);
        const chunkDoc = chunkDocRes.rows[0];
        client.release();
        
        assert(
            chunkDoc.text.includes('[EMAIL]'), 
            "Email successfully redacted to [EMAIL]", 
            "Email redaction failed"
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

        console.log(chalk.yellow("\nTest 2: Deduplication Engine"));
        
        const dedup1 = await db.absorb(TEST_TEXT_2, { profile: 'speed' });
        const dedup2 = await db.absorb(TEST_TEXT_2, { profile: 'speed' });

        assert(
            dedup1.inserted[0].contentId.toString() === dedup2.inserted[0].contentId.toString(),
            "Sequential deduplication successful",
            "Sequential deduplication failed"
        );

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
        if (db) await db.close();
    }
}

runFeaturesTest();
