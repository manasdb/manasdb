#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import * as dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
import CostCalculator from '../src/utils/CostCalculator.ts';

import { readFileSync } from 'fs';
import { join } from 'path';

dotenv.config();

const pkg = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf8'));

const program = new Command();
program
  .name('manas')
  .description('CLI Management Tool for ManasDB Vector Stores')
  .version(pkg.version);

function getUri(): string {
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

async function withDb(callback: (db: any) => Promise<void>): Promise<void> {
    const uri = getUri();
    const client = new MongoClient(uri);
    try {
        await client.connect();
        const db = client.db('manasdb_test');
        await callback(db);
    } catch (err: any) {
        console.log(chalk.red(`\n[ERROR] Database connection failed: ${err.message}\n`));
    } finally {
        await client.close();
    }
}

program
    .command('stats')
    .description('View system ROI, token savings, and overall metrics')
    .action(async () => {
        await withDb(async (db) => {
            console.log(chalk.cyan('\n[INFO] Fetching ManasDB Statistics...\n'));

            const telemetryCollection = db.collection('_manas_telemetry');
            const chunksCollection = db.collection('_manas_chunks');
            const docsCollection = db.collection('_manas_documents');

            const chunkCount = await chunksCollection.countDocuments();
            const docCount = await docsCollection.countDocuments();

            const events = await telemetryCollection.find({
                eventName: { $in: ['ABSORB_COMPLETED', 'DEDUPLICATED'] }
            }).toArray();

            let totalTokensSaved = 0;
            let totalActualCost = 0;
            let totalCostSaved = 0;
            let totalTimeSaved = 0;

            events.forEach((evt: any) => {
                if (evt.eventName === 'ABSORB_COMPLETED') {
                    totalActualCost += evt.financial?.actual_cost || 0;
                }
                if (evt.eventName === 'DEDUPLICATED') {
                    totalTokensSaved += evt.financial?.tokens || 0;
                    totalCostSaved += evt.financial?.savings_financial || 0;
                    totalTimeSaved += evt.financial?.savings_latency || 0;
                }
            });

            console.log(chalk.bold('System Metrics:'));
            console.log(`  Ingested Documents:              ${chalk.green(docCount)}`);
            console.log(`  Total Chunks Stored:             ${chalk.green(chunkCount)}`);
            console.log(`  Total API Ingestion Cost:        ${chalk.yellow('$' + totalActualCost.toFixed(6))}`);

            console.log(chalk.bold('\nROI & Cache Savings:'));
            console.log(`  Redundant API Calls Prevented:   ${chalk.green(events.filter((e: any) => e.eventName === 'DEDUPLICATED').length)}`);
            console.log(`  Total Tokens Saved (Cache Hit):  ${chalk.green(totalTokensSaved)}`);
            console.log(`  Total Financial Savings:         ${chalk.green('$' + totalCostSaved.toFixed(6))}`);
            console.log(`  Total Latency Bypassed:          ${chalk.green(totalTimeSaved + ' ms')}`);
            console.log('\n');
        });
    });

program
    .command('cost-estimate <text>')
    .description('Estimate token usage and cost for embedding a given text string')
    .option('-m, --model <model>', 'Embedding model to use for estimation', 'openai')
    .action((text: string, options: any) => {
        const { tokens, costUSD, model } = CostCalculator.estimateAbsorbCost(text, options.model);
        console.log(chalk.cyan('\n[INFO] Cost Estimation Result\n'));
        console.log(`  Input Text:   "${text.substring(0, 40)}${text.length > 40 ? '...' : ''}"`);
        console.log(`  Model:        ${chalk.yellow(model)}`);
        console.log(`  Est. Tokens:  ${chalk.green(tokens)}`);
        console.log(`  Est. Cost:    ${chalk.green('$' + costUSD.toFixed(6))}\n`);
    });

program.parse(process.argv);
