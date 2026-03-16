#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import * as dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
import CostCalculator from '../src/utils/CostCalculator.js';

// Load .env from current working directory
dotenv.config();

const program = new Command();
program
  .name('manas')
  .description('CLI Management Tool for ManasDB Vector Stores')
  .version('0.1.0');

// Ensure MongoDB URI exists
function getUri() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.log(chalk.red('\n[ERROR] MONGODB_URI not found in your environment.'));
        console.log(chalk.yellow('\nSetup Guide:'));
        console.log(chalk.white('1. Create a `.env` file in your root folder.'));
        console.log(chalk.white('2. Add: MONGODB_URI=mongodb+srv://<user>:<pwd>@cluster.mongodb.net/'));
        console.log(chalk.white('3. Try running this command again.\n'));
        process.exit(1);
    }
    return uri;
}

// Connect Helper
async function withDb(callback) {
    const uri = getUri();
    const client = new MongoClient(uri);
    try {
        await client.connect();
        const db = client.db('manasdb_test');
        await callback(db);
    } catch (err) {
        console.log(chalk.red(`\n[ERROR] Database connection failed: ${err.message}\n`));
    } finally {
        await client.close();
    }
}

// ──────────────────────────────────────────────────────────────────────────────
//  stats — ROI dashboard
// ──────────────────────────────────────────────────────────────────────────────
program
    .command('stats')
    .description('View system ROI, token savings, and overall metrics')
    .action(async () => {
        await withDb(async (db) => {
            console.log(chalk.cyan('\n[INFO] Fetching ManasDB Statistics...\n'));

            const telemetryCollection = db.collection('_manas_telemetry');
            const chunksCollection    = db.collection('_manas_chunks');
            const docsCollection      = db.collection('_manas_documents');

            const chunkCount = await chunksCollection.countDocuments();
            const docCount   = await docsCollection.countDocuments();

            const events = await telemetryCollection.find({
                eventName: { $in: ['ABSORB_COMPLETED', 'DEDUPLICATED'] }
            }).toArray();

            let totalTokensSaved   = 0;
            let totalActualCost    = 0;
            let totalCostSaved     = 0;
            let totalTimeSaved     = 0;

            events.forEach(evt => {
                if (evt.eventName === 'ABSORB_COMPLETED') {
                    totalActualCost += evt.financial?.actual_cost || 0;
                }
                if (evt.eventName === 'DEDUPLICATED') {
                    totalTokensSaved += evt.financial?.tokens || 0;
                    totalCostSaved   += evt.financial?.savings_financial || 0;
                    totalTimeSaved   += evt.financial?.savings_latency || 0;
                }
            });

            console.log(chalk.bold('System Metrics:'));
            console.log(`  Ingested Documents:              ${chalk.green(docCount)}`);
            console.log(`  Total Chunks Stored:             ${chalk.green(chunkCount)}`);
            console.log(`  Total API Ingestion Cost:        ${chalk.yellow('$' + totalActualCost.toFixed(6))}`);

            console.log(chalk.bold('\nROI & Cache Savings:'));
            console.log(`  Redundant API Calls Prevented:   ${chalk.green(events.filter(e => e.eventName === 'DEDUPLICATED').length)}`);
            console.log(`  Total Tokens Saved (Cache Hit):  ${chalk.green(totalTokensSaved)}`);
            console.log(`  Total Financial Savings:         ${chalk.green('$' + totalCostSaved.toFixed(6))}`);
            console.log(`  Total Latency Bypassed:          ${chalk.green(totalTimeSaved + ' ms')}`);
            console.log('\n');
        });
    });

// ──────────────────────────────────────────────────────────────────────────────
//  list — Recent memories
// ──────────────────────────────────────────────────────────────────────────────
program
    .command('list')
    .description('Show the last 10 ingested memories')
    .action(async () => {
        await withDb(async (db) => {
            console.log(chalk.cyan('\n[INFO] Recent ManasDB Memories...\n'));

            const docsCollection = db.collection('_manas_documents');
            const recent = await docsCollection.find({}).sort({ createdAt: -1 }).limit(10).toArray();

            if (recent.length === 0) {
                console.log(chalk.yellow('  No memories found in the database.'));
                return;
            }

            recent.forEach((item, idx) => {
                const preview = (item.original_text || item.text || '(no preview)').substring(0, 60);
                console.log(`  [${chalk.dim(idx + 1)}] ${chalk.white(preview)}...`);
            });
            console.log('\n');
        });
    });

// ──────────────────────────────────────────────────────────────────────────────
//  health — System status
// ──────────────────────────────────────────────────────────────────────────────
program
    .command('health')
    .description('Validates the MongoDB connection and index status')
    .action(async () => {
        await withDb(async (db) => {
            console.log(chalk.cyan('\n[INFO] Checking System Health...\n'));

            console.log(`  Connection:         ${chalk.green('[SUCCESS] Online')}`);

            // List all collection names
            const cols     = await db.listCollections().toArray();
            const colNames = cols.map(c => c.name);

            // Vectors collection + Atlas search index check
            if (colNames.includes('_manas_vectors')) {
                console.log(`  Vectors Collection: ${chalk.green('[SUCCESS] Online')}`);
                try {
                    const indexes = await db.collection('_manas_vectors').listSearchIndexes().toArray();
                    if (indexes.length > 0) {
                        const staleWarn = indexes.length > 2 ? chalk.yellow(` ⚠️  ${indexes.length - 1} stale (run index-prune)`) : '';
                        console.log(`  Vector Indexes:     ${chalk.green(`[SUCCESS] Active (${indexes.length} found)`)}${staleWarn}`);
                    } else {
                        console.log(`  Vector Indexes:     ${chalk.yellow('[WARN] Pending or None')}`);
                    }
                } catch (e) {
                    console.log(`  Vector Indexes:     ${chalk.yellow('[WARN] Could not verify (Requires Atlas Vector Search)')}`);
                }
            } else {
                console.log(`  Vectors Collection: ${chalk.red('[ERROR] Missing')}`);
            }

            // Chunks collection
            if (colNames.includes('_manas_chunks')) {
                const count = await db.collection('_manas_chunks').countDocuments();
                console.log(`  Chunks Collection:  ${chalk.green(`[SUCCESS] Online (${count} chunks)`)}`);
            } else {
                console.log(`  Chunks Collection:  ${chalk.yellow('[WARN] Empty — run absorb() to ingest data')}`);
            }

            // Documents collection
            if (colNames.includes('_manas_documents')) {
                const count = await db.collection('_manas_documents').countDocuments();
                console.log(`  Docs Collection:    ${chalk.green(`[SUCCESS] Online (${count} documents)`)}`);
            } else {
                console.log(`  Docs Collection:    ${chalk.yellow('[WARN] Empty — run absorb() to ingest data')}`);
            }

            // Telemetry collection
            if (colNames.includes('_manas_telemetry')) {
                const eventCount = await db.collection('_manas_telemetry').countDocuments();
                console.log(`  Telemetry:          ${chalk.green(`[SUCCESS] Online (${eventCount} events logged)`)}`);
            } else {
                console.log(`  Telemetry:          ${chalk.dim('[INFO] No events yet — enable telemetry: true in constructor')}`);
            }

            console.log('\n');
        });
    });

// ──────────────────────────────────────────────────────────────────────────────
//  index-prune — Remove stale Atlas vector indexes
// ──────────────────────────────────────────────────────────────────────────────
program
    .command('index-prune')
    .description('Remove stale Atlas vector indexes from old/unused embedding models')
    .action(async () => {
        await withDb(async (db) => {
            console.log(chalk.cyan('\n[INFO] Scanning for stale Atlas vector indexes...\n'));
            try {
                const indexes = await db.collection('_manas_vectors').listSearchIndexes().toArray();
                if (indexes.length <= 1) {
                    console.log(chalk.green('  ✅ No stale indexes found. All clean!\n'));
                    return;
                }
                const sorted = [...indexes].sort((a, b) =>
                    new Date(b.latestDefinition?.createdAt || 0) - new Date(a.latestDefinition?.createdAt || 0)
                );
                const toKeep = sorted[0];
                const toDrop  = sorted.slice(1);
                console.log(`  Keeping: ${chalk.green(toKeep.name)}`);
                for (const idx of toDrop) {
                    try {
                        await db.collection('_manas_vectors').dropSearchIndex(idx.name);
                        console.log(`  Dropped: ${chalk.yellow(idx.name)}`);
                    } catch (dropErr) {
                        console.log(`  ${chalk.red('Failed to drop')} ${idx.name}: ${dropErr.message}`);
                    }
                }
                console.log(chalk.green(`\n  Pruned ${toDrop.length} stale index(es).\n`));
            } catch (e) {
                console.log(chalk.red(`  [ERROR] Could not list indexes: ${e.message}`));
            }
        });
    });

// ──────────────────────────────────────────────────────────────────────────────
//  trace — Visual pipeline debugger
// ──────────────────────────────────────────────────────────────────────────────
program
    .command('trace <query>')
    .description('Run a query and output a Visual Trace Debugging tree')
    .action(async (query) => {
        await withDb(async (db) => {
            console.log(chalk.cyan(`\n[INFO] Running Trace for Query: "${query}"\n`));

            try {
                const { default: ManasDB } = await import('../src/index.js');
                const memory = new ManasDB({
                    uri:         getUri(),
                    dbName:      'manasdb_test',
                    projectName: 'trace_debug',
                    telemetry:   false,
                    debug:       false
                });

                await memory.init();

                const results = await memory.recall(query, { mode: 'qa', limit: 1 });

                if (results && results._trace) {
                    console.log(chalk.bold('Search Trace Debugging Output:'));
                    console.log(chalk.green(JSON.stringify(results._trace, null, 2)));
                }

                if (results && results.length > 0) {
                    console.log(chalk.bold('\nTop Result Chunk:'));
                    console.log(chalk.white(results[0].metadata.matchedChunk));
                } else {
                    console.log(chalk.yellow('\nNo results matched the threshold.'));
                }
                console.log('\n');
            } catch (err) {
                console.log(chalk.red(`[TRACE ERROR] ${err.message}`));
                console.log(err);
            }
            process.exit(0);
        });
    });

// ──────────────────────────────────────────────────────────────────────────────
//  benchmark — Run the full benchmark suite
// ──────────────────────────────────────────────────────────────────────────────
program
    .command('benchmark')
    .description('Starts the ManasDB Benchmark Suite')
    .action(async () => {
        try {
            const { default: runBenchmark } = await import('../src/benchmark.js');
            await runBenchmark();
        } catch (e) {
            console.log(chalk.red('\n[ERROR] Benchmark failed to run.'));
            console.log(e);
            process.exit(1);
        }
    });

// ──────────────────────────────────────────────────────────────────────────────
//  cost-estimate — Pre-flight cost analysis
// ──────────────────────────────────────────────────────────────────────────────
program
    .command('cost-estimate <text>')
    .description('Estimate embedding cost for a piece of text across different providers')
    .option('-m, --model <model>', 'Specific model for estimation (openai, gemini, ollama)', 'openai')
    .action((text, options) => {
        console.log(chalk.cyan(`\n[INFO] Estimating Cost for text (${text.length} chars)...\n`));
        
        const estimation = CostCalculator.estimateAbsorbCost(text, options.model);
        
        console.log(chalk.bold('Estimation Details:'));
        console.log(`  Model:           ${chalk.white(estimation.model)}`);
        console.log(`  Estimated Tokens: ${chalk.green(estimation.tokens)}`);
        console.log(`  Estimated Cost:  ${chalk.yellow('$' + estimation.costUSD.toFixed(6))}`);
        
        if (estimation.costUSD === 0) {
            console.log(chalk.dim('\n  (Note: Ollama and local models have $0.00 API cost)'));
        }
        
        console.log('\n');
    });

program.parse(process.argv);
